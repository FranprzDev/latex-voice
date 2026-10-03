# Vibe LaTeX

Dictá ecuaciones en español y convertí lo que vas explicando en Markdown y LaTeX dentro de Obsidian. Podés narrar una resolución paso a paso sin dictar comandos de LaTeX.

> “la integral de a a b de efe de equis de equis” → `$\int_a^b f(x)\,dx$`

## Uso

1. Ejecutá **Vibe LaTeX: Iniciar o detener el dictado por voz** desde la paleta de comandos o con el atajo `Cmd/Ctrl+Shift+M`.
2. Dictá en español. Las pausas separan fragmentos y cada resultado se inserta en la nota.
3. Volvé a ejecutar el comando para terminar.

Para corregir el último fragmento, ejecutá **Vibe LaTeX: Corregir la última frase dictada** (`Cmd/Ctrl+Shift+R`) y volvé a dictar ese fragmento completo. La corrección recuerda la última frase incluso después de reiniciar Obsidian, siempre que la nota no haya cambiado. También podés seleccionar texto existente en la nota e iniciar el dictado para reemplazarlo con voz.

## Qué convierte

- Texto explicativo en español mezclado con ecuaciones.
- Derivaciones de varios pasos, sustituciones, fracciones parciales, transformadas y límites, respetando el orden dictado.
- Vocabulario matemático hablado, como “equis”, “i griega”, “de equis”, “alfa” e “infinito”.
- Anotaciones de gráficos descriptas en voz.

El plugin convierte lo que se dicta; no debe completar ni corregir pasos matemáticos que no se hayan dicho. La conversión requiere una clave API de OpenAI. El servicio puede cobrar el uso según la cuenta del usuario.

## Configuración

1. Instalá y habilitá el plugin.
2. En **Ajustes → Vibe LaTeX**, ingresá tu clave API de OpenAI.
3. Permití el acceso al micrófono cuando Obsidian o el sistema lo soliciten.

Opcional: ajustá la **duración de la pausa** que separa cada frase y la
**duración máxima** de una frase. El audio se guarda con la extensión correcta
cuando activás **Guardar audio**.

## Privacidad

El audio se envía al servicio configurado para transcribirlo y el texto reconocido se envía al mismo servicio para convertirlo en Markdown y LaTeX. OpenAI se usa por defecto; la URL base permite configurar un endpoint compatible. Las grabaciones se descartan al terminar salvo que actives **Guardar audio**.

## Desarrollo

```bash
npm install
npm run build
npm test
npm run test:e2e       # requiere OPENAI_API_KEY
npm run test:obsidian  # requiere Obsidian cerrado y disponible por CDP
```

Los fixtures de audio se sintetizan con `say` en macOS. La prueba `test:e2e` comprueba la transcripción y la conversión usando el servicio configurado.
