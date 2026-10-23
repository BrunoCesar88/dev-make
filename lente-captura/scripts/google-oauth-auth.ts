#!/usr/bin/env npx tsx
/**
 * Login único no Google para obter GOOGLE_OAUTH_REFRESH_TOKEN
 *
 * Pré-requisitos no Google Cloud (OAuth client Web):
 *   Authorized redirect URI → http://localhost:3456/oauth/callback
 *
 * Usage: npm run google:auth
 */
import { createServer } from 'http';
import { exec } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';
import { google } from 'googleapis';

config({ path: resolve(__dirname, '../.env.local') });

const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      '❌ Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no .env.local'
    );
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n🔐 Autorização Google Sheets (OAuth)\n');
  console.log('1. Abra este link no navegador:\n');
  console.log(`   ${authUrl}\n`);
  console.log('2. Entre com a conta Google que tem acesso às planilhas');
  console.log('3. Clique em Permitir\n');
  console.log(`⏳ Aguardando callback em ${REDIRECT_URI} ...\n`);

  if (process.platform === 'darwin') {
    exec(`open "${authUrl}"`);
    console.log('🌐 Abrindo o navegador automaticamente...\n');
  }

  await new Promise<void>((resolvePromise, reject) => {
    const server = createServer(async (req, res) => {
      if (!req.url?.startsWith('/oauth/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Erro</h1><p>${error}</p><p>Pode fechar esta aba.</p>`);
        server.close();
        reject(new Error(`Google retornou erro: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Código não recebido</h1><p>Pode fechar esta aba.</p>');
        return;
      }

      try {
        const { tokens } = await oauth2.getToken(code);
        const refreshToken = tokens.refresh_token;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<h1>✅ Autorizado!</h1><p>Pode fechar esta aba e voltar ao terminal.</p>'
        );
        server.close();

        if (!refreshToken) {
          console.log('⚠️  Nenhum refresh_token retornado.');
          console.log(
            '   Revogue o acesso em https://myaccount.google.com/permissions'
          );
          console.log('   e rode npm run google:auth de novo.\n');
          if (tokens.access_token) {
            console.log('Access token (temporário):', tokens.access_token);
          }
          reject(new Error('refresh_token ausente'));
          return;
        }

        console.log('✅ Sucesso! Cole no .env.local:\n');
        console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${refreshToken}\n`);
        resolvePromise();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Erro ao trocar código</h1><p>Veja o terminal.</p>');
        server.close();
        reject(err);
      }
    });

    server.listen(PORT, () => {
      // ready
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Porta ${PORT} em uso. Feche o processo anterior ou mude a porta no script.`
          )
        );
      } else {
        reject(err);
      }
    });
  });
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
