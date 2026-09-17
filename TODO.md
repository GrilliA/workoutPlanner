# TODO

## Grafico settimanale coach

Ripensare il chart su Analisi portafoglio e Analisi atleta. Si era provato ECharts con una **linea**: il tipo non convince. Le barre SVG sono ancora quelle di ora.

Quando si riprende:

- Scegliere il tipo (barre, area, combo sessioni/volume, altro) prima della libreria
- Coprire 4w / 12w / 52w senza perdere le settimane sull’anno
- Accessibilità: dato per settimana anche senza hover (niente canvas `aria-hidden` al posto dell’SVG)
- Tooltip: carico solo se c’è volume nel periodo
- Test del mapper/opzioni nel `npm test` FE (oggi i test analytics non girano in CI)
