import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

async function expectNoA11yViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
}

test('admin gera convite, candidato responde no celular, admin vê o resultado', async ({ page, browser }, testInfo) => {
  const company = `Empresa ${testInfo.project.name} ${run}`;
  const email = `admin-${testInfo.project.name}-${run}@example.com`;

  // 1. Admin cadastra a empresa
  await page.goto('/login');
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Cadastrar minha empresa' }).click();
  await page.getByLabel('Nome da empresa').fill(company);
  await page.getByLabel('Seu nome').fill('Ana Admin');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();

  // 2. Gera o convite
  await page.getByRole('link', { name: 'Convites' }).click();
  await page.getByLabel('Cargo (opcional)').fill('Analista Financeiro');
  await page.getByRole('button', { name: 'Gerar link' }).click();
  const link = await page.getByLabel('Link do convite').inputValue();
  expect(link).toContain('/t/');
  await expect(page.getByRole('link', { name: 'Enviar no WhatsApp' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/\?text=/,
  );
  await expectNoA11yViolations(page);

  // 3. Candidato (outro contexto, sem login) responde
  const ctx = await browser.newContext(testInfo.project.use);
  const cand = await ctx.newPage();
  await cand.goto(link);
  await expect(cand.getByText(company).first()).toBeVisible();
  await expectNoA11yViolations(cand);
  await expect(cand.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  await cand.getByRole('checkbox').check();
  await cand.getByRole('button', { name: 'Continuar' }).click();

  // validação do formulário
  await cand.getByRole('button', { name: 'Começar o teste' }).click();
  await expect(cand.getByRole('alert').first()).toBeVisible();
  await cand.getByLabel('Nome completo').fill('Maria Silva');
  await cand.getByLabel('Telefone (WhatsApp)').fill('11999998888');
  await expect(cand.getByLabel('Telefone (WhatsApp)')).toHaveValue('(11) 99999-8888');
  await cand.getByLabel('E-mail').fill('maria@example.com');
  await expect(cand.getByLabel('Cargo')).toHaveValue('Analista Financeiro'); // vem do convite
  await cand.getByLabel('Setor').fill('Financeiro');
  await cand.getByLabel('Data de nascimento').fill('1990-05-20');
  await cand.getByRole('button', { name: 'Começar o teste' }).click();

  // 24 perguntas: 1ª opção=4, 2ª=3, 3ª=2, 4ª=1  → perfil D
  for (let g = 0; g < 24; g++) {
    await expect(cand.getByText(`Pergunta ${g + 1} de 24`)).toBeVisible();
    const items = cand.getByRole('group');
    for (let i = 0; i < 4; i++)
      await items
        .nth(i)
        .getByRole('button', { name: new RegExp(`nota ${4 - i}$`) })
        .click();
    if (g === 0) await expectNoA11yViolations(cand);
    await cand.getByRole('button', { name: g === 23 ? 'Revisar respostas' : 'Próxima' }).click();
  }

  await cand.getByRole('button', { name: 'Enviar respostas' }).click();
  await expect(cand.getByRole('heading', { level: 1 })).toHaveText('Perfil DI · Dominância com Influência');
  await expect(cand.getByRole('heading', { name: 'Seu perfil combinado: DI' })).toBeVisible();
  await expect(cand.getByRole('heading', { name: 'Perfil principal: Dominância' })).toBeVisible();
  await expect(cand.getByRole('heading', { name: 'Perfil secundário: Influência' })).toBeVisible();
  await expect(cand.getByRole('note')).toHaveCount(0); // 96 × 72: sem empate
  await expect(cand.getByText(/Perguntas para a entrevista/)).toHaveCount(0); // nada de recrutador
  await expectNoA11yViolations(cand);

  // recarregar mantém o resumo; link não pode ser reutilizado em outro navegador
  await cand.reload();
  await expect(cand.getByRole('heading', { level: 1 })).toHaveText('Perfil DI · Dominância com Influência');
  const other = await (await browser.newContext()).newPage();
  await other.goto(link);
  await expect(other.getByRole('heading', { name: 'Link indisponível' })).toBeVisible();
  await ctx.close();

  // 4. Admin vê o resultado
  await page.getByRole('link', { name: 'Resultados' }).click();
  await expect(page.getByText('Maria Silva').locator('visible=true').first()).toBeVisible();
  await page.getByRole('button', { name: 'Filtros' }).click();
  await page.getByLabel('Nome').fill('inexistente');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByText('Nenhum resultado para os filtros atuais.')).toBeVisible();
  await page.getByRole('button', { name: 'Filtros' }).click();
  await page.getByLabel('Nome').fill('maria');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await page
    .getByRole('link', { name: /Maria Silva/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Maria Silva' })).toBeVisible();
  await expect(page.getByText('Perguntas para a entrevista')).toBeVisible();
  await expect(page.getByText('96 (100%)')).toBeVisible();
  await expectNoA11yViolations(page);

  // sessão sobrevive a recarregar (refresh por cookie)
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Maria Silva' })).toBeVisible();

  // LGPD: exportar os dados do titular e excluí-los (com confirmação)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar dados (JSON)' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('dados-do-titular.json');
  await page.getByRole('button', { name: 'Excluir dados' }).click();
  await expect(page.getByRole('button', { name: 'Confirmar exclusão definitiva' })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Confirmar exclusão definitiva' }).click();
  await expect(page).toHaveURL(/\/admin\/resultados$/);
  await expect(page.getByText('Nenhum resultado para os filtros atuais.')).toBeVisible();
});

test('link inexistente mostra mensagem amigável', async ({ page }) => {
  await page.goto('/t/token-que-nao-existe');
  await expect(page.getByRole('heading', { name: 'Link indisponível' })).toBeVisible();
});

test('admin altera nome e retenção da empresa; recrutador não vê a tela', async ({ page, browser }, testInfo) => {
  const suffix = `${testInfo.project.name}-${run}-cfg`;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Cadastrar minha empresa' }).click();
  await page.getByLabel('Nome da empresa').fill(`Config ${suffix}`);
  await page.getByLabel('Seu nome').fill('Ana Admin');
  await page.getByLabel('E-mail').fill(`cfg-${suffix}@example.com`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();

  await page.getByRole('link', { name: 'Config.' }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expectNoA11yViolations(page);

  // valor fora do intervalo é recusado
  await page.getByLabel('Retenção dos dados (dias)').fill('5');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.getByLabel('Nome da empresa').fill(`Empresa Nova ${suffix}`);
  await page.getByLabel('Retenção dos dados (dias)').fill('90');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Configurações salvas.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Nome da empresa')).toHaveValue(`Empresa Nova ${suffix}`);
  await expect(page.getByLabel('Retenção dos dados (dias)')).toHaveValue('90');

  // captura para inspeção visual da navegação (5 itens) — não é asserção
  if (testInfo.project.name === 'mobile') await page.screenshot({ path: '/tmp/settings-mobile.png' });

  // recrutador: sem item de menu e a rota não mostra o formulário
  await page.getByRole('link', { name: 'Usuários' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Rita Recrutadora');
  await page.getByLabel('E-mail').fill(`rita-${suffix}@example.com`);
  await page.getByLabel('Senha inicial').fill('senha-forte-123');
  await page.getByLabel('Papel').selectOption('RECRUITER');
  await page.getByRole('button', { name: 'Adicionar usuário' }).click();
  await expect(page.getByText(`rita-${suffix}@example.com`)).toBeVisible();

  const ctx = await browser.newContext(testInfo.project.use);
  const rec = await ctx.newPage();
  await rec.goto('/login');
  await rec.getByLabel('E-mail').fill(`rita-${suffix}@example.com`);
  await rec.getByLabel('Senha').fill('senha-forte-123');
  await rec.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(rec.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await expect(rec.getByRole('link', { name: 'Config.' })).toHaveCount(0);
  await expect(rec.getByRole('link', { name: 'Usuários' })).toHaveCount(0);
  await ctx.close();
});

test('landing: apresenta o produto, passa no axe e leva ao cadastro e à demonstração', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('DISC');
  await expect(page.getByRole('heading', { name: 'Como funciona' })).toBeVisible();
  await expectNoA11yViolations(page);
  if (testInfo.project.name === 'mobile') await page.screenshot({ path: '/tmp/landing-mobile.png', fullPage: true });

  await page.getByRole('link', { name: 'Cadastrar minha empresa' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastrar empresa' })).toBeVisible();
  await expect(page.getByLabel('Nome da empresa')).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: 'Ver a demonstração' }).click();
  await expect(page.getByRole('button', { name: 'Entrar na demonstração (dados fictícios)' })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Entrar na demonstração (dados fictícios)' }).click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await expect(page.getByText('Testes concluídos')).toBeVisible();
  await expect(page.getByText('14', { exact: true }).first()).toBeVisible();
  await expectNoA11yViolations(page);
});

test('demonstração: resultado com empate mostra aviso, perfil principal, secundário e leitura combinada', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar na demonstração (dados fictícios)' }).click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();

  await page.getByRole('link', { name: 'Resultados' }).click();
  // a lista indica o código combinado e o empate
  await expect(page.getByText('(empate)').locator('visible=true').first()).toBeVisible();
  await page
    .getByRole('link', { name: /Rafael Moura/ })
    .first()
    .click();

  await expect(page.getByRole('heading', { name: 'Rafael Moura' })).toBeVisible();
  const note = page.getByRole('note');
  await expect(note).toBeVisible();
  await expect(note).toContainText('Empate entre os dois perfis');
  await expect(page.getByRole('heading', { name: /Leitura combinada \(/ })).toBeVisible();
  // no empate os dois perfis já vêm abertos
  await expect(page.getByText(/Perfil principal: /)).toBeVisible();
  await expect(page.getByText(/Perfil secundário: /)).toBeVisible();
  await expect(page.locator('details[open]')).toHaveCount(2);
  await expect(page.getByText('Principal', { exact: true })).toBeVisible();
  await expect(page.getByText('Secundário', { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);

  // sem empate: as seções dos perfis ficam recolhidas, sem aviso
  await page.getByRole('link', { name: '← Resultados' }).click();
  await page
    .getByRole('link', { name: /Helena Prado/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Helena Prado' })).toBeVisible();
  await expect(page.getByRole('note')).toHaveCount(0);
  await expect(page.locator('details[open]')).toHaveCount(0);
  await expectNoA11yViolations(page);
});

test('apresentação: gera o link a partir do nome da empresa, mostra o QR e o candidato vê o nome', async ({
  page,
  browser,
}, testInfo) => {
  const company = `Cliente ${testInfo.project.name} ${run}`;
  await page.goto('/apresentacao');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Teste de perfil comportamental');
  await expectNoA11yViolations(page);

  // sem nome, valida
  await page.getByRole('button', { name: /Gerar link do teste/ }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.getByLabel('Nome da empresa').fill(company);
  await page.getByRole('button', { name: /Gerar link do teste/ }).click();
  await expect(page.getByRole('heading', { name: `Link pronto para ${company}` })).toBeVisible();
  await expect(page.getByRole('img', { name: /QR code do link do teste/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enviar no WhatsApp' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/\?text=/,
  );
  await expectNoA11yViolations(page);
  if (testInfo.project.name === 'mobile')
    await page.screenshot({ path: '/tmp/presentation-mobile.png', fullPage: true });

  // o candidato, sem login, abre o link e vê o nome da empresa digitado
  const link = await page.getByLabel('Link do teste').inputValue();
  expect(link).toContain('/t/');
  const ctx = await browser.newContext(testInfo.project.use);
  const cand = await ctx.newPage();
  await cand.goto(link);
  await expect(cand.getByText(company).first()).toBeVisible();
  await ctx.close();
});
