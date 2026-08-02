import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                min-height: 100vh;
                margin: 0;
                background: #F8FAFB;
              }
              #root {
                display: flex;
                flex-direction: column;
                flex: 1;
                min-height: 100vh;
              }
              #root > div {
                display: flex;
                flex-direction: column;
                flex: 1;
                min-height: 100vh;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
