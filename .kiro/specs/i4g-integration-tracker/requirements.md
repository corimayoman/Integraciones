# Documento de Requerimientos — I4G Integration Tracker Dashboard

## Introducción

El I4G Integration Tracker Dashboard es una aplicación web estática que permite al equipo I4G (Integrations for Growth) visualizar y monitorear el estado de integración de las empresas adquiridas por Globant. El dashboard consume datos en tiempo real desde Jira Cloud a través de un proxy Node.js existente (OAuth 2.0 3LO) y ofrece un modo offline con datos hardcodeados como fallback. El objetivo es reemplazar el seguimiento manual por CSV/Excel con una herramienta visual, interactiva y actualizada.

## Glosario

- **Dashboard**: Aplicación web estática (HTML/CSS/JS) que presenta los datos de integración de forma visual
- **Proxy**: Servidor Node.js existente en `proxy/` que conecta con Jira Cloud vía OAuth 2.0 (3LO), corriendo en puerto 3002
- **Track**: Cada uno de los 14 procesos de integración definidos por I4G (desde Kick Off hasta Closure Assets Decommissioning)
- **Empresa_Adquirida**: Compañía adquirida por Globant que debe pasar por el proceso de integración I4G
- **Severidad**: Nivel de criticidad de un track: Critical, High, Medium o Low
- **Tema_Jira**: Issue de tipo Theme en Jira que representa una Empresa_Adquirida (proyecto G4G)
- **Iniciativa_Jira**: Issue de tipo Initiative en Jira que representa un plan de integración IST&SEC por empresa
- **Épica_Jira**: Issue de tipo Epic en Jira que representa un Track del proceso (proyecto GLO586)
- **Subtarea_Jira**: Issue de tipo Sub-task en Jira que representa un paso dentro de un Track
- **Historia_Jira**: Issue de tipo Story en Jira que representa tareas de trabajo adicionales
- **Estado_Jira**: Valor de estado de un issue en Jira: Closed, Open, In Progress, Reopened, Blocked, Rejected, Analyzing, Solution In Progress, Backlog
- **Modo_Live**: Modo de operación donde el Dashboard consume datos en tiempo real desde Jira a través del Proxy
- **Modo_Offline**: Modo de operación donde el Dashboard utiliza datos hardcodeados como fallback
- **Región**: Agrupación geográfica de empresas adquiridas (Americas, EMEA & New Markets)
- **ITX_Manager**: Responsable regional de infraestructura IT asignado a una Región
- **Matriz_Integración**: Vista tabular de Empresas_Adquiridas × Tracks con indicadores de estado
- **Ambiente_QA**: Entorno de pruebas (Quality Assurance) donde se validan los cambios antes de pasar a producción
- **Ambiente_Prod**: Entorno de producción donde opera la versión estable del sistema accesible por los usuarios finales
- **Pipeline_CICD**: Pipeline automatizado de Integración Continua y Despliegue Continuo que ejecuta build, tests y deploy
- **Regresión_Diaria**: Suite de tests automatizados que se ejecuta diariamente sobre todo el sistema para detectar regresiones
- **Auto_Documentación**: Generación y mantenimiento automático de documentación técnica (diagramas de arquitectura, flujo y datos)
- **GitHub_Issue**: Unidad de trabajo documentada en GitHub Issues, clasificada por tipo y criticidad, con dependencias explícitas
- **Tipo_Issue**: Clasificación funcional de un GitHub_Issue: Feature, Bug, Infra, Docs, Test, o Refactor
- **Criticidad_Issue**: Nivel de urgencia de un GitHub_Issue: Crítica, Alta, Media, o Baja
- **Traza_Auditoría**: Registro completo y auditable que vincula cada idea con su requerimiento, su implementación, su test de validación, y su GitHub_Issue correspondiente
- **Sistema_Diseño**: Conjunto de componentes reutilizables, tokens de diseño (colores, tipografía, espaciado) y patrones de interacción que garantizan consistencia visual en todo el Dashboard
- **Token_Color**: Variable de diseño que define un valor de color reutilizable en toda la interfaz (ej: `--color-severity-critical`, `--color-bg-primary`)
- **Escala_Tipográfica**: Conjunto jerárquico de tamaños de fuente definidos para títulos, subtítulos, cuerpo y etiquetas, aplicados de forma consistente en todo el Dashboard
- **Breakpoint**: Punto de quiebre de ancho de pantalla donde el layout del Dashboard se adapta: 768px (móvil), 1024px (tablet), 1440px (escritorio)
- **Estado_Vista**: Estado visual de un componente dependiente de datos: cargando (loading), vacío (empty), con error (error), o con datos (loaded)
- **Modo_Oscuro**: Variante de la interfaz con paleta de colores invertida (fondo oscuro, texto claro) para reducir fatiga visual en ambientes con poca luz
- **Hoja_Impresión**: Hoja de estilos CSS específica para medios de impresión que optimiza el layout y oculta elementos interactivos al imprimir reportes
- **Capa_Datos**: Módulo del sistema responsable de la obtención, caché y persistencia de datos (comunicación con Proxy y Jira)
- **Capa_Negocio**: Módulo del sistema responsable de la lógica de transformación, cálculo de métricas, filtrado y reglas de negocio
- **Capa_Presentación**: Módulo del sistema responsable del renderizado de vistas, interacción con el usuario y gestión de estado de la interfaz
- **Circuit_Breaker**: Patrón de resiliencia que detiene temporalmente las llamadas a un servicio externo tras detectar fallos consecutivos, evitando sobrecarga y permitiendo recuperación
- **Degradación_Elegante**: Capacidad del sistema de continuar operando con funcionalidad reducida cuando un servicio externo no está disponible
- **Caché_Proxy**: Almacenamiento temporal de respuestas en el Proxy con un TTL (Time To Live) configurable para reducir llamadas repetidas a Jira
- **Caché_Navegador**: Almacenamiento de recursos estáticos (HTML, CSS, JS, imágenes) en el navegador del usuario mediante headers de cache-control
- **CSP_Headers**: Content Security Policy headers HTTP que restringen las fuentes de contenido permitidas para prevenir ataques de inyección
- **Observabilidad**: Capacidad del sistema de exponer su estado interno mediante logs estructurados, endpoints de health check y métricas de uptime
- **Complejidad_Ciclomática**: Métrica de calidad de código que mide la cantidad de caminos independientes en una función; valores altos indican código difícil de mantener y testear

## Requerimientos

### Requerimiento 1: Obtención y Transformación de Datos desde Jira

**User Story:** Como miembro del equipo I4G, quiero que el Dashboard obtenga y transforme los datos de Jira automáticamente, para poder visualizar el estado de las integraciones sin procesamiento manual.

#### Criterios de Aceptación

1. WHEN el usuario hace clic en el botón "Connect Jira", THE Dashboard SHALL iniciar el flujo de autenticación OAuth 2.0 (3LO) a través del Proxy en puerto 3002
2. WHEN el Proxy retorna los issues de Jira, THE Dashboard SHALL transformar los datos crudos en una estructura jerárquica: Empresa_Adquirida → Track → Subtareas
3. WHEN el Dashboard recibe un Tema_Jira, THE Dashboard SHALL extraer el nombre de la Empresa_Adquirida y el año de adquisición del campo summary
4. WHEN el Dashboard recibe una Épica_Jira vinculada a un Tema_Jira, THE Dashboard SHALL asociar la Épica_Jira al Track correspondiente usando el número de track (01-14) del campo summary
5. WHEN el Dashboard recibe Subtareas_Jira vinculadas a una Épica_Jira, THE Dashboard SHALL agrupar las Subtareas_Jira bajo el Track correspondiente
6. WHEN el Dashboard calcula el progreso de un Track, THE Dashboard SHALL computar el porcentaje de completitud basado en la proporción de Subtareas_Jira con Estado_Jira "Closed" respecto al total de Subtareas_Jira del Track
7. IF el Proxy no está disponible o la autenticación falla, THEN THE Dashboard SHALL activar el Modo_Offline y mostrar datos hardcodeados con un indicador visual de modo offline
8. WHEN el Dashboard opera en Modo_Live, THE Dashboard SHALL mostrar un indicador visual de conexión activa en el header

### Requerimiento 2: Matriz de Integración (Vista Principal)

**User Story:** Como miembro del equipo I4G, quiero ver una matriz de empresas adquiridas × tracks con indicadores de estado, para tener una vista general del progreso de todas las integraciones.

#### Criterios de Aceptación

1. THE Dashboard SHALL mostrar una tabla donde las filas representan Empresas_Adquiridas y las columnas representan los 14 Tracks
2. WHEN el Dashboard renderiza la Matriz_Integración, THE Dashboard SHALL mostrar cada celda con un código de color según el estado: gris para no iniciado (0% completitud), azul para en progreso (1-99% completitud), verde para completado (100% completitud), y rojo para bloqueado (al menos una Subtarea_Jira con Estado_Jira "Blocked")
3. WHEN el usuario posiciona el cursor sobre una celda de la Matriz_Integración, THE Dashboard SHALL mostrar un tooltip con el nombre del Track, el porcentaje de completitud, y la cantidad de Subtareas_Jira completadas vs totales
4. WHEN el Dashboard renderiza la Matriz_Integración, THE Dashboard SHALL ordenar las Empresas_Adquiridas por año de adquisición de forma descendente (más recientes primero)
5. WHEN el Dashboard renderiza los encabezados de columna de la Matriz_Integración, THE Dashboard SHALL mostrar el número y nombre abreviado de cada Track, con un indicador visual de Severidad (color o ícono)
6. WHEN el usuario hace clic en una fila de Empresa_Adquirida, THE Dashboard SHALL expandir la fila mostrando el detalle de cada Track con la lista de Subtareas_Jira y sus estados individuales

### Requerimiento 3: Filtros y Segmentación

**User Story:** Como miembro del equipo I4G, quiero filtrar las integraciones por severidad, año, región y estado, para poder enfocarme en las integraciones que requieren atención.

#### Criterios de Aceptación

1. THE Dashboard SHALL proveer un filtro de Severidad con opciones: Critical, High, Medium, Low, y una opción "Todas"
2. WHEN el usuario selecciona un filtro de Severidad, THE Dashboard SHALL mostrar en la Matriz_Integración únicamente las columnas de Tracks que correspondan a la Severidad seleccionada
3. THE Dashboard SHALL proveer un filtro de año de adquisición con las opciones disponibles extraídas de los datos
4. WHEN el usuario selecciona un filtro de año, THE Dashboard SHALL mostrar en la Matriz_Integración únicamente las Empresas_Adquiridas del año seleccionado
5. THE Dashboard SHALL proveer un filtro de Región con opciones: Americas, EMEA & New Markets, y una opción "Todas"
6. WHEN el usuario selecciona un filtro de Región, THE Dashboard SHALL mostrar en la Matriz_Integración únicamente las Empresas_Adquiridas de la Región seleccionada
7. THE Dashboard SHALL proveer un filtro de estado con opciones: No Iniciado, En Progreso, Completado, Bloqueado, y una opción "Todos"
8. WHEN el usuario aplica múltiples filtros simultáneamente, THE Dashboard SHALL aplicar todos los filtros con lógica AND y actualizar la Matriz_Integración en tiempo real

### Requerimiento 4: Panel de Resumen y KPIs

**User Story:** Como líder del equipo I4G, quiero ver métricas resumidas y KPIs del estado general de las integraciones, para poder reportar el progreso y tomar decisiones.

#### Criterios de Aceptación

1. THE Dashboard SHALL mostrar un panel de resumen en la parte superior con las siguientes métricas: total de Empresas_Adquiridas activas, porcentaje de completitud global, cantidad de Tracks bloqueados, y cantidad de Tracks críticos en progreso
2. THE Dashboard SHALL mostrar una tabla de resumen por año con columnas: año, cantidad de empresas, porcentaje de completitud promedio por Severidad (Critical, High, Medium, Low)
3. THE Dashboard SHALL mostrar un gráfico de barras "Actividades Completadas por Severidad" que muestre el porcentaje de completitud agrupado por Severidad para cada año
4. WHEN los filtros activos cambian, THE Dashboard SHALL recalcular y actualizar todas las métricas del panel de resumen para reflejar únicamente los datos filtrados

### Requerimiento 5: Vista de Detalle por Empresa

**User Story:** Como miembro del equipo I4G, quiero ver el detalle completo de una empresa adquirida específica, para poder hacer seguimiento granular de su integración.

#### Criterios de Aceptación

1. WHEN el usuario selecciona una Empresa_Adquirida desde la Matriz_Integración, THE Dashboard SHALL mostrar una vista de detalle con los 14 Tracks y su estado individual
2. WHEN el Dashboard renderiza la vista de detalle, THE Dashboard SHALL mostrar para cada Track: nombre, Severidad, porcentaje de completitud, cantidad de Subtareas_Jira por Estado_Jira, y el assignee principal
3. WHEN el Dashboard renderiza la vista de detalle, THE Dashboard SHALL mostrar una barra de progreso visual para cada Track con colores según la Severidad del Track
4. WHEN el usuario expande un Track en la vista de detalle, THE Dashboard SHALL listar todas las Subtareas_Jira del Track con: summary, Estado_Jira, y assignee
5. WHEN una Subtarea_Jira tiene Estado_Jira "Blocked", THE Dashboard SHALL resaltar visualmente la Subtarea_Jira en rojo dentro de la lista del Track

### Requerimiento 6: Alertas de Tracks Críticos Demorados

**User Story:** Como líder del equipo I4G, quiero recibir alertas visuales sobre tracks críticos que están demorados o bloqueados, para poder priorizar la atención y escalar cuando sea necesario.

#### Criterios de Aceptación

1. THE Dashboard SHALL identificar como "demorado" todo Track con Severidad Critical o High que tenga al menos una Subtarea_Jira con Estado_Jira "Blocked" o "Reopened"
2. THE Dashboard SHALL mostrar un panel de alertas que liste todos los Tracks demorados con: nombre de la Empresa_Adquirida, nombre del Track, Severidad, y Estado_Jira de la Subtarea_Jira bloqueante
3. WHEN el panel de alertas contiene al menos un Track demorado, THE Dashboard SHALL mostrar un indicador numérico de alertas activas en el header
4. WHEN el usuario hace clic en una alerta del panel, THE Dashboard SHALL navegar a la vista de detalle de la Empresa_Adquirida correspondiente con el Track afectado expandido

### Requerimiento 7: Modo Live/Offline con Fallback

**User Story:** Como miembro del equipo I4G, quiero que el dashboard funcione tanto con datos en vivo de Jira como con datos offline, para poder consultar información incluso cuando no tengo conexión al proxy.

#### Criterios de Aceptación

1. THE Dashboard SHALL mostrar un botón "Connect Jira" en el header que inicie la autenticación OAuth 2.0 a través del Proxy
2. WHEN la autenticación es exitosa, THE Dashboard SHALL cambiar a Modo_Live, reemplazar el botón "Connect Jira" por un indicador de "Conectado", y cargar los datos desde el Proxy
3. WHEN el Dashboard se carga sin autenticación previa, THE Dashboard SHALL iniciar en Modo_Offline utilizando datos hardcodeados representativos
4. IF la conexión con el Proxy se pierde durante Modo_Live, THEN THE Dashboard SHALL mostrar una notificación al usuario y mantener los últimos datos cargados en pantalla
5. WHEN el Dashboard opera en Modo_Offline, THE Dashboard SHALL mostrar un banner visible indicando "Modo Offline - Datos de ejemplo"
6. WHEN el usuario hace clic en "Desconectar" estando en Modo_Live, THE Dashboard SHALL cerrar la sesión OAuth, limpiar los datos cacheados, y volver a Modo_Offline

### Requerimiento 8: Transformación de Datos Jira a Modelo del Dashboard

**User Story:** Como desarrollador, quiero que el dashboard transforme los datos crudos de Jira en un modelo estructurado, para poder renderizar las vistas de forma consistente.

#### Criterios de Aceptación

1. THE Dashboard SHALL parsear la respuesta del endpoint `/api/raw` del Proxy y construir un árbol jerárquico: Tema_Jira → Épica_Jira → Subtarea_Jira
2. WHEN el Dashboard parsea un Tema_Jira, THE Dashboard SHALL extraer el nombre de la Empresa_Adquirida y el año usando el patrón "[Nombre] - [Año]" del campo summary
3. WHEN el Dashboard parsea una Épica_Jira, THE Dashboard SHALL mapear la Épica_Jira al Track correspondiente usando el prefijo numérico "XX." del campo summary (donde XX es 01-14)
4. WHEN el Dashboard encuentra una Épica_Jira que no coincide con ninguno de los 14 Tracks, THE Dashboard SHALL agrupar la Épica_Jira bajo una categoría "Otros"
5. THE Dashboard SHALL mapear cada Estado_Jira a un estado simplificado del dashboard: "Completado" para Closed, "En Progreso" para In Progress/Analyzing/Solution In Progress, "No Iniciado" para Open/Backlog, "Bloqueado" para Blocked, y "Rechazado" para Rejected/Reopened
6. FOR ALL datos válidos de Jira, parsear y luego serializar a JSON y luego parsear nuevamente SHALL producir un modelo equivalente al original (propiedad round-trip)

### Requerimiento 9: Vista por Región

**User Story:** Como ITX Manager, quiero ver las integraciones agrupadas por región geográfica, para poder hacer seguimiento de las empresas bajo mi responsabilidad.

#### Criterios de Aceptación

1. THE Dashboard SHALL agrupar las Empresas_Adquiridas en las regiones: Americas, y EMEA & New Markets
2. WHEN el usuario selecciona la vista por Región, THE Dashboard SHALL mostrar la Matriz_Integración con separadores visuales entre grupos de Región
3. WHEN el Dashboard renderiza la vista por Región, THE Dashboard SHALL mostrar el nombre del ITX_Manager responsable de cada Región como encabezado del grupo
4. WHEN el Dashboard renderiza la vista por Región, THE Dashboard SHALL mostrar métricas de completitud agregadas por Región: porcentaje de completitud promedio y cantidad de Tracks bloqueados por Región

### Requerimiento 10: Interfaz de Usuario y Diseño Visual

**User Story:** Como miembro del equipo I4G, quiero que el dashboard tenga una interfaz clara, responsiva y accesible, para poder usarlo cómodamente desde cualquier dispositivo.

#### Criterios de Aceptación

1. THE Dashboard SHALL utilizar una paleta de colores consistente para representar Severidades: rojo para Critical, naranja para High, amarillo para Medium, y azul para Low
2. THE Dashboard SHALL ser responsivo y funcionar correctamente en pantallas con ancho mínimo de 1024px
3. THE Dashboard SHALL incluir un header con: logo/título "I4G Integration Tracker", botón "Connect Jira" o indicador de estado de conexión, e indicador de alertas activas
4. THE Dashboard SHALL proveer navegación entre las vistas: Matriz_Integración, Vista por Región, y Panel de Alertas
5. WHEN el Dashboard carga datos desde el Proxy, THE Dashboard SHALL mostrar un indicador de carga (spinner) hasta que los datos estén disponibles
6. THE Dashboard SHALL utilizar HTML semántico y atributos ARIA para cumplir con pautas de accesibilidad


### Requerimiento 11: Ambientes QA y Producción

**User Story:** Como líder técnico del equipo I4G, quiero que la solución cuente con ambientes separados de QA y Producción, para poder validar cambios antes de impactar a los usuarios finales.

#### Criterios de Aceptación

1. THE Pipeline_CICD SHALL mantener dos ambientes independientes: Ambiente_QA y Ambiente_Prod, cada uno con su propia configuración, datos y URL de acceso
2. WHEN un cambio es desplegado en Ambiente_QA, THE Pipeline_CICD SHALL ejecutar la suite completa de tests automatizados antes de habilitar la promoción a Ambiente_Prod
3. WHEN todos los tests pasan en Ambiente_QA, THE Pipeline_CICD SHALL habilitar la promoción del cambio a Ambiente_Prod mediante aprobación manual o automática según la política configurada
4. THE Ambiente_QA SHALL utilizar datos de prueba representativos que no contengan información sensible de producción
5. IF un despliegue en Ambiente_Prod falla, THEN THE Pipeline_CICD SHALL ejecutar un rollback automático a la versión estable anterior y notificar al equipo

### Requerimiento 12: Procedimientos CI/CD

**User Story:** Como desarrollador del equipo I4G, quiero contar con pipelines de CI/CD automatizados, para poder integrar, testear y desplegar cambios de forma confiable y repetible.

#### Criterios de Aceptación

1. THE Pipeline_CICD SHALL ejecutar automáticamente las etapas de build, lint, test unitario, test de integración y deploy en cada push a la rama principal del repositorio
2. WHEN un pull request es creado, THE Pipeline_CICD SHALL ejecutar build y tests automatizados y reportar el resultado como check de estado en el pull request
3. THE Pipeline_CICD SHALL bloquear el merge de un pull request cuando al menos un test falla o el build no es exitoso
4. WHEN el Pipeline_CICD completa un deploy exitoso, THE Pipeline_CICD SHALL registrar la versión desplegada, el commit hash, la fecha y el autor del cambio en un log de despliegues
5. THE Pipeline_CICD SHALL completar la etapa de build y tests en un tiempo máximo de 10 minutos para mantener ciclos de feedback rápidos

### Requerimiento 13: Regresión Diaria del Sistema

**User Story:** Como líder del equipo I4G, quiero que se ejecute una regresión automatizada diaria de todo el sistema, para detectar regresiones introducidas por los cambios del día anterior.

#### Criterios de Aceptación

1. THE Regresión_Diaria SHALL ejecutarse automáticamente todos los días a una hora configurada e incluir todos los tests funcionales, de integración y end-to-end del sistema
2. THE Regresión_Diaria SHALL incluir la validación de los cambios desplegados en Ambiente_QA durante las últimas 24 horas
3. WHEN la Regresión_Diaria detecta al menos un test fallido, THE Regresión_Diaria SHALL generar un reporte detallado con los tests fallidos, el componente afectado y el último commit asociado, y notificar al equipo
4. WHEN la Regresión_Diaria completa exitosamente sin fallos, THE Regresión_Diaria SHALL registrar el resultado en el log de auditoría con fecha, duración y cantidad de tests ejecutados
5. THE Regresión_Diaria SHALL generar un reporte histórico accesible que muestre la tendencia de resultados de regresión de los últimos 30 días

### Requerimiento 14: Auto-Documentación del Sistema

**User Story:** Como miembro del equipo I4G, quiero que toda la documentación técnica se genere y mantenga automáticamente, para asegurar que la documentación esté siempre actualizada y completa.

#### Criterios de Aceptación

1. THE Auto_Documentación SHALL generar y mantener actualizado un diagrama de arquitectura del sistema que refleje los componentes, sus conexiones y dependencias
2. THE Auto_Documentación SHALL generar y mantener actualizados diagramas de flujo para cada proceso principal del sistema: autenticación OAuth, obtención de datos de Jira, transformación de datos y renderizado de vistas
3. THE Auto_Documentación SHALL generar y mantener actualizado un diagrama de datos que muestre el modelo de datos del Dashboard y su mapeo con la estructura de Jira
4. WHEN el código fuente cambia en la rama principal, THE Pipeline_CICD SHALL regenerar la documentación técnica afectada como parte del proceso de deploy
5. THE Auto_Documentación SHALL almacenar toda la documentación generada en el repositorio del proyecto en una carpeta dedicada, versionada junto con el código
6. THE Auto_Documentación SHALL incluir un índice navegable que liste todos los diagramas y documentos disponibles con fecha de última actualización

### Requerimiento 15: GitHub Issues como Fuente de Verdad

**User Story:** Como líder del equipo I4G, quiero que todo el trabajo esté documentado como GitHub Issues clasificados por tipo y criticidad con dependencias explícitas, para tener trazabilidad completa del trabajo realizado.

#### Criterios de Aceptación

1. THE GitHub_Issue SHALL clasificarse obligatoriamente con un Tipo_Issue (Feature, Bug, Infra, Docs, Test, o Refactor) y una Criticidad_Issue (Crítica, Alta, Media, o Baja) mediante labels de GitHub
2. WHEN se crea un GitHub_Issue, THE GitHub_Issue SHALL incluir en su descripción: contexto del problema o necesidad, criterios de aceptación, y la referencia al requerimiento asociado
3. WHEN un GitHub_Issue depende de otro GitHub_Issue, THE GitHub_Issue SHALL documentar la dependencia explícitamente mediante referencia cruzada en la descripción (ej: "Depende de #XX", "Bloquea a #YY")
4. THE GitHub_Issue SHALL utilizar templates de GitHub Issues predefinidos para cada Tipo_Issue, asegurando consistencia en la información documentada
5. WHEN un GitHub_Issue cambia de estado (abierto, en progreso, cerrado), THE GitHub_Issue SHALL registrar la fecha y el autor del cambio de estado en el historial del issue
6. THE GitHub_Issue SHALL vincular en su descripción o comentarios los pull requests, commits y resultados de tests asociados a su resolución

### Requerimiento 16: Trazabilidad y Auditoría de Punta a Punta

**User Story:** Como auditor o líder del equipo I4G, quiero que el proceso sea auditable de punta a punta desde la idea hasta el test que la valida, para poder verificar que cada decisión y cambio tiene justificación y evidencia.

#### Criterios de Aceptación

1. THE Traza_Auditoría SHALL vincular cada requerimiento del documento de requerimientos con uno o más GitHub_Issues que lo implementan
2. THE Traza_Auditoría SHALL vincular cada GitHub_Issue con los pull requests y commits que lo resuelven
3. THE Traza_Auditoría SHALL vincular cada criterio de aceptación con al menos un test automatizado que lo valida
4. THE Traza_Auditoría SHALL mantener una matriz de trazabilidad accesible que muestre el mapeo: Idea → Requerimiento → GitHub_Issue → Pull Request → Test de Validación
5. WHEN un requerimiento cambia, THE Traza_Auditoría SHALL registrar el cambio con fecha, autor, justificación y los GitHub_Issues impactados
6. THE Traza_Auditoría SHALL ser consultable en cualquier momento, permitiendo navegar desde cualquier punto de la cadena (idea, requerimiento, issue, PR o test) hacia los demás elementos vinculados


### Requerimiento 17: Mejores Prácticas de Diseño Visual

**User Story:** Como usuario del Dashboard, quiero que la interfaz siga las mejores prácticas de diseño visual, para tener una experiencia de uso profesional, intuitiva y consistente.

#### Criterios de Aceptación

1. THE Sistema_Diseño SHALL definir componentes reutilizables (botones, tarjetas, tablas, tooltips, badges, modales) con variantes documentadas, espaciado consistente basado en una unidad base de 8px, una Escala_Tipográfica de al menos 5 niveles (h1-h4 y body), y Token_Color para cada rol semántico (primary, secondary, success, warning, error, severity-critical, severity-high, severity-medium, severity-low)
2. THE Dashboard SHALL presentar la información con jerarquía visual clara: métricas y KPIs críticos visibles en la parte superior sin necesidad de scroll, y detalles granulares accesibles mediante divulgación progresiva (expandir filas, tooltips, vistas de detalle)
3. THE Dashboard SHALL utilizar tipos de gráfico apropiados para cada dato: barras para comparaciones entre categorías, barras apiladas para composición, y tablas para datos tabulares detallados; cada gráfico SHALL incluir etiquetas de ejes, leyenda visible y valores numéricos accesibles
4. THE Dashboard SHALL utilizar una paleta de colores segura para daltonismo (color-blind safe) en todas las visualizaciones de datos, combinando color con un segundo canal visual (íconos, patrones o etiquetas de texto) para garantizar legibilidad sin depender exclusivamente del color
5. THE Dashboard SHALL implementar un layout responsivo con enfoque mobile-first y Breakpoints en 768px, 1024px y 1440px, adaptando la disposición de componentes, el tamaño de fuentes y la navegación a cada rango de ancho de pantalla
6. WHEN una vista depende de datos externos, THE Dashboard SHALL mostrar un Estado_Vista apropiado: un skeleton loader o spinner durante la carga, un mensaje descriptivo con ilustración cuando no hay datos disponibles (estado vacío), y un mensaje de error con opción de reintentar cuando la obtención de datos falla
7. THE Dashboard SHALL aplicar patrones de interacción consistentes: estados hover visibles en elementos interactivos, indicadores de foco (focus ring) para navegación por teclado conformes a pautas de accesibilidad, y transiciones CSS con duración máxima de 300ms
8. THE Dashboard SHALL proveer soporte de Modo_Oscuro mediante Token_Color que se alternen según la preferencia del sistema operativo del usuario o una selección manual en la interfaz, manteniendo contraste mínimo de 4.5:1 (AA) en ambos modos
9. THE Dashboard SHALL incluir una Hoja_Impresión que optimice el layout para papel tamaño A4, oculte elementos interactivos (botones, filtros, navegación), muestre todos los datos expandidos, y preserve los colores de estado de la Matriz_Integración

### Requerimiento 18: Mejores Prácticas de Diseño de Sistemas

**User Story:** Como desarrollador del equipo I4G, quiero que el sistema siga las mejores prácticas de ingeniería de software, para asegurar mantenibilidad, escalabilidad y resiliencia.

#### Criterios de Aceptación

1. THE Dashboard SHALL separar su código en tres capas independientes: Capa_Datos (obtención y caché de datos desde el Proxy), Capa_Negocio (transformación, cálculo de métricas, filtrado y reglas de negocio), y Capa_Presentación (renderizado de vistas y gestión de estado de la interfaz), sin dependencias directas entre Capa_Datos y Capa_Presentación
2. WHEN el Dashboard realiza una llamada al Proxy o a la API de Jira, THE Capa_Datos SHALL envolver la llamada con lógica de reintento (máximo 3 intentos con backoff exponencial), un Circuit_Breaker que se active tras 5 fallos consecutivos, y Degradación_Elegante que active el Modo_Offline cuando el Circuit_Breaker está abierto
3. THE Proxy SHALL implementar una Caché_Proxy con TTL configurable mediante variable de entorno, y THE Dashboard SHALL configurar Caché_Navegador para recursos estáticos con headers cache-control apropiados (inmutable para assets con hash, no-cache para HTML)
4. THE Dashboard SHALL mantener todos los secretos y credenciales exclusivamente en el Proxy (nunca en código cliente), THE Proxy SHALL configurar CORS permitiendo únicamente los orígenes autorizados, THE Proxy SHALL enviar CSP_Headers en cada respuesta, y THE Capa_Datos SHALL sanitizar toda entrada del usuario antes de incluirla en consultas o renderizado
5. THE Dashboard SHALL completar la carga inicial (First Contentful Paint) en un tiempo máximo de 3 segundos en una conexión de 4G, THE Dashboard SHALL implementar lazy loading para vistas no críticas (Vista por Región, Panel de Alertas), y THE Pipeline_CICD SHALL monitorear el tamaño del bundle y fallar el build cuando el bundle principal supere un umbral configurable
6. THE Proxy SHALL emitir logs estructurados en formato JSON con nivel (info, warn, error), timestamp, request ID y contexto de la operación; THE Proxy SHALL exponer un endpoint `/health` que retorne el estado del servicio y la conectividad con Jira; y THE Pipeline_CICD SHALL configurar monitoreo de uptime que verifique el endpoint `/health` con una frecuencia mínima de cada 5 minutos
7. THE Dashboard y THE Proxy SHALL externalizar todos los valores específicos de ambiente (URLs, puertos, TTLs, feature flags) en archivos `.env`, sin URLs ni configuraciones hardcodeadas en el código fuente, y THE Pipeline_CICD SHALL validar la presencia de todas las variables de entorno requeridas antes de cada deploy
8. THE Pipeline_CICD SHALL ejecutar linting (ESLint) y formateo automático (Prettier) en cada build, y THE Pipeline_CICD SHALL fallar el build cuando una función supere una Complejidad_Ciclomática de 15
9. THE Pipeline_CICD SHALL ejecutar auditoría de vulnerabilidades de dependencias (npm audit) en cada build, THE Pipeline_CICD SHALL fallar el build cuando se detecten vulnerabilidades de severidad alta o crítica, y THE Pipeline_CICD SHALL ejecutar actualizaciones automatizadas de dependencias con frecuencia semanal mediante herramienta configurada (Dependabot o Renovate)
