# Buenas prácticas — DOMINO Chain backend

## Por qué existe este documento
El 21 de junio de 2026 un cambio en el schema de `Video` (se añadió el campo
`isPublic` con `default: true`) hizo que el feed de inicio dejara de mostrar
videos ya publicados. La causa: Mongoose solo aplica los valores `default`
a documentos **nuevos**. Los documentos que ya existían en MongoDB antes del
cambio se quedan sin ese campo en el documento real, y una consulta como
`Video.find({ isPublic: true })` los excluye aunque deberían contar como
públicos.

## Regla a seguir siempre que se añade un campo booleano/enum a un schema existente

1. **Nunca filtres por igualdad estricta contra el valor por defecto** si el
   campo es nuevo y puede haber documentos antiguos sin él. En su lugar,
   filtra por la negación del caso que sí quieres excluir:
   - Mal:  `{ isPublic: true }`
   - Bien: `{ isPublic: { $ne: false } }`  (incluye `true` y "no existe")
2. Si el campo nuevo es algo que SÍ debe excluir a los documentos antiguos
   por defecto (el caso contrario), hay que hacerlo explícito con una
   migración (`updateMany` con el filtro `{ campo: { $exists: false } }`)
   en vez de confiar en el default de Mongoose, que no es retroactivo.
3. Antes de desplegar un cambio de schema que toque un filtro de consulta
   usado por una pantalla con datos reales (el feed, el perfil, etc.),
   probar manualmente que los documentos *ya existentes* (no solo los
   nuevos que se crean en la prueba) se siguen viendo igual.

## Sobre el repositorio y Maris AI
Este repo recibe commits automáticos del frontend cada vez que se publica
una actualización desde Maris AI (ver README.md). Los cambios manuales que
se hagan directamente sobre `frontend/` en GitHub (como los de esta sesión)
pueden quedar sobrescritos la próxima vez que se publique desde Maris AI,
salvo que esa plataforma sincronice también en sentido contrario. Conviene
confirmarlo con Maris AI antes de seguir editando el frontend a mano, para
no perder estos cambios sin darse cuenta.
