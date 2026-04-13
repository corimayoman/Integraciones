# Documento de Requerimientos — Módulo de Recolección de Datos

## Introducción

El Módulo de Recolección de Datos es una nueva sección dentro del I4G Integration Tracker que reemplaza los Google Sheets utilizados actualmente para recopilar datos de integración de cada empresa adquirida. Cada empresa tiene un conjunto de 6 hojas/tabs que siguen 3 patrones estructurales (Inventario, Cuestionario con gestión, Cuestionario simple). El módulo digitaliza estas hojas en la aplicación, con persistencia en SQLite, autenticación de usuarios, control de roles por columna (empresa vs Globant), e importación de datos existentes desde CSV.

## Glosario

- **Módulo_Recolección**: Nueva sección del I4G Integration Tracker que permite la carga, edición y consulta de datos de integración por empresa, reemplazando los Google Sheets
- **Empresa_Adquirida**: Compañía adquirida por Globant que debe completar los formularios de integración I4G
- **Hoja**: Cada uno de los 6 formularios de datos asociados a una Empresa_Adquirida: Apps, Infrastructure, IT Experience, MST, Building Security, Compliance and Certifications
- **Patrón_Inventario**: Estructura de hoja donde las filas representan ítems y las columnas representan atributos del ítem (usado por Apps y Compliance and Certifications)
- **Patrón_Cuestionario_Gestión**: Estructura de hoja tipo Q&A con columnas adicionales de gestión Globant: owner, due date, comments (usado por Infrastructure, IT Experience, MST)
- **Patrón_Cuestionario_Simple**: Estructura de hoja tipo Q&A sin columnas de gestión Globant (usado por Building Security)
- **Columnas_Empresa**: Conjunto de columnas de una Hoja que son editables exclusivamente por usuarios con Rol_Empresa para la Empresa_Adquirida correspondiente
- **Columnas_Globant**: Conjunto de columnas de una Hoja que son editables exclusivamente por usuarios con Rol_Globant para la Empresa_Adquirida correspondiente
- **Rol_Empresa**: Rol de edición que permite a un usuario modificar las Columnas_Empresa de las Hojas de una Empresa_Adquirida asignada
- **Rol_Globant**: Rol de edición que permite a un usuario modificar las Columnas_Globant de las Hojas de una Empresa_Adquirida asignada
- **Rol_Admin**: Rol de administración que permite gestionar usuarios, asignar empresas y roles, e importar datos
- **Usuario**: Persona registrada en el sistema con credenciales de acceso y uno o más roles asignados por empresa
- **Asignación_Usuario_Empresa**: Relación muchos-a-muchos entre un Usuario y una Empresa_Adquirida, con un Rol específico (Rol_Empresa o Rol_Globant)
- **Categoría**: Agrupación temática de preguntas dentro de una Hoja de Patrón_Cuestionario_Gestión (ej: "Devices", "Architecture", "ISP")
- **Sección**: Agrupación temática de preguntas dentro de la Hoja Building Security (ej: "About the Building", "About the Office", "Support and Maintenance")
- **API_Backend**: Conjunto de endpoints REST del servidor Node.js que gestionan autenticación, datos de hojas, usuarios y empresas, extendiendo el Proxy existente
- **SQLite_DB**: Base de datos SQLite utilizada por el API_Backend para persistir usuarios, empresas, hojas y datos de formularios
- **Token_JWT**: Token JSON Web Token utilizado para autenticar y autorizar las peticiones de los usuarios al API_Backend
- **Importación_CSV**: Proceso de carga masiva de datos desde archivos CSV exportados de Google Sheets hacia la SQLite_DB

## Requerimientos

### Requerimiento 1: Persistencia de Datos con SQLite

**User Story:** Como miembro del equipo I4G, quiero que los datos de integración se almacenen en una base de datos SQLite en el servidor, para reemplazar los Google Sheets y tener una fuente de datos centralizada y confiable.

#### Criterios de Aceptación

1. THE API_Backend SHALL almacenar todos los datos de Hojas, Empresas_Adquiridas y Usuarios en una SQLite_DB ubicada en el servidor del Proxy existente
2. THE SQLite_DB SHALL definir tablas separadas para: empresas, usuarios, asignaciones usuario-empresa, y datos de cada tipo de Hoja (Apps, Compliance, Infrastructure, IT Experience, MST, Building Security)
3. WHEN el API_Backend recibe una petición de escritura válida, THE API_Backend SHALL persistir los datos en la SQLite_DB dentro de una transacción atómica
4. IF una transacción de escritura falla, THEN THE API_Backend SHALL revertir todos los cambios de la transacción y retornar un código de error descriptivo al cliente
5. WHEN el API_Backend se inicia por primera vez, THE API_Backend SHALL crear automáticamente el esquema de la SQLite_DB si las tablas no existen (migración inicial)
6. THE SQLite_DB SHALL almacenar marcas de tiempo de creación y última modificación para cada registro de datos de Hoja

### Requerimiento 2: Autenticación de Usuarios

**User Story:** Como administrador del equipo I4G, quiero que los usuarios se autentiquen con credenciales para acceder al módulo, para garantizar que solo personas autorizadas puedan ver y editar los datos de integración.

#### Criterios de Aceptación

1. THE API_Backend SHALL proveer un endpoint de login que reciba credenciales (nombre de usuario y contraseña) y retorne un Token_JWT válido
2. WHEN un Usuario envía credenciales válidas al endpoint de login, THE API_Backend SHALL generar un Token_JWT con el identificador del Usuario, sus roles y una expiración configurable
3. WHEN un Usuario envía credenciales inválidas al endpoint de login, THE API_Backend SHALL retornar un error HTTP 401 con un mensaje genérico que no revele si el usuario existe o no
4. THE API_Backend SHALL validar el Token_JWT en cada petición protegida verificando firma, expiración y estructura
5. IF un Token_JWT es inválido o ha expirado, THEN THE API_Backend SHALL retornar un error HTTP 401 y el Módulo_Recolección SHALL redirigir al Usuario a la pantalla de login
6. THE API_Backend SHALL almacenar las contraseñas de los Usuarios hasheadas con bcrypt y un salt único por Usuario en la SQLite_DB
7. WHEN el API_Backend se inicia por primera vez, THE API_Backend SHALL crear un Usuario con Rol_Admin con credenciales por defecto documentadas, que el administrador deberá cambiar en el primer uso

### Requerimiento 3: Gestión de Usuarios y Asignaciones

**User Story:** Como administrador del equipo I4G, quiero poder crear, editar y desactivar usuarios, y asignarlos a empresas con roles específicos, para controlar quién puede editar qué datos.

#### Criterios de Aceptación

1. WHEN un Rol_Admin accede al panel de gestión de usuarios, THE Módulo_Recolección SHALL mostrar la lista de todos los Usuarios con su nombre, estado (activo/inactivo) y cantidad de empresas asignadas
2. WHEN un Rol_Admin crea un nuevo Usuario, THE API_Backend SHALL registrar el Usuario con nombre, nombre de usuario único, contraseña inicial y estado activo
3. WHEN un Rol_Admin desactiva un Usuario, THE API_Backend SHALL marcar al Usuario como inactivo y THE API_Backend SHALL rechazar las peticiones autenticadas de Usuarios inactivos con error HTTP 403
4. WHEN un Rol_Admin asigna un Usuario a una Empresa_Adquirida, THE API_Backend SHALL crear una Asignación_Usuario_Empresa con el rol especificado (Rol_Empresa o Rol_Globant)
5. THE API_Backend SHALL permitir múltiples Asignaciones_Usuario_Empresa para un mismo Usuario (un Usuario puede estar asignado a varias Empresas_Adquiridas)
6. THE API_Backend SHALL permitir múltiples Usuarios asignados a una misma Empresa_Adquirida con roles independientes
7. WHEN un Rol_Admin edita un Usuario existente, THE API_Backend SHALL permitir modificar el nombre, restablecer la contraseña y cambiar el estado activo/inactivo

### Requerimiento 4: Control de Acceso por Rol y Empresa

**User Story:** Como miembro del equipo I4G, quiero que cada usuario solo pueda editar las columnas que le corresponden según su rol y empresa asignada, para mantener la integridad de los datos y la separación de responsabilidades.

#### Criterios de Aceptación

1. WHEN un Usuario con Rol_Empresa accede a una Hoja de una Empresa_Adquirida asignada, THE Módulo_Recolección SHALL permitir la edición únicamente de las Columnas_Empresa y mostrar las Columnas_Globant como solo lectura
2. WHEN un Usuario con Rol_Globant accede a una Hoja de una Empresa_Adquirida asignada, THE Módulo_Recolección SHALL permitir la edición únicamente de las Columnas_Globant y mostrar las Columnas_Empresa como solo lectura
3. WHEN un Usuario intenta acceder a datos de una Empresa_Adquirida a la que no está asignado, THE API_Backend SHALL retornar un error HTTP 403
4. WHEN un Usuario con Rol_Admin accede a cualquier Hoja, THE Módulo_Recolección SHALL permitir la edición de todas las columnas (Columnas_Empresa y Columnas_Globant)
5. THE API_Backend SHALL validar los permisos de escritura en cada petición de modificación, verificando que el Usuario tiene el rol adecuado para las columnas que intenta modificar en la Empresa_Adquirida correspondiente
6. IF un Usuario envía una petición de escritura sobre columnas para las que no tiene permiso, THEN THE API_Backend SHALL rechazar la petición completa con error HTTP 403 sin aplicar cambios parciales

### Requerimiento 5: Navegación y Estructura del Módulo

**User Story:** Como usuario del sistema, quiero navegar fácilmente entre empresas y sus hojas de datos, para poder consultar y editar la información de integración de forma organizada.

#### Criterios de Aceptación

1. THE Módulo_Recolección SHALL agregar una entrada de navegación "Recolección de Datos" en la barra de navegación principal del I4G Integration Tracker, separada de las vistas existentes (Matriz, Región, Alertas)
2. WHEN el Usuario navega a la sección de Recolección de Datos, THE Módulo_Recolección SHALL mostrar la lista de Empresas_Adquiridas a las que el Usuario tiene acceso (según sus Asignaciones_Usuario_Empresa)
3. WHEN el Usuario selecciona una Empresa_Adquirida, THE Módulo_Recolección SHALL mostrar una vista con pestañas para las 6 Hojas: Apps, Infrastructure, IT Experience, MST, Building Security, Compliance and Certifications
4. WHEN el Usuario selecciona una pestaña de Hoja, THE Módulo_Recolección SHALL renderizar la Hoja según su patrón correspondiente (Patrón_Inventario, Patrón_Cuestionario_Gestión o Patrón_Cuestionario_Simple)
5. THE Módulo_Recolección SHALL utilizar rutas hash consistentes con el router existente, siguiendo el patrón: `#/data-collection`, `#/data-collection/{empresaId}`, `#/data-collection/{empresaId}/{hojaId}`
6. WHEN un Rol_Admin navega a la sección de Recolección de Datos, THE Módulo_Recolección SHALL mostrar todas las Empresas_Adquiridas registradas en el sistema independientemente de las asignaciones


### Requerimiento 6: Renderizado de Hojas — Patrón Inventario

**User Story:** Como usuario del sistema, quiero ver y editar las hojas de tipo inventario (Apps, Compliance) en formato tabular, para poder gestionar el inventario de aplicaciones y certificaciones de cada empresa.

#### Criterios de Aceptación

1. WHEN el Usuario accede a la Hoja "Apps" de una Empresa_Adquirida, THE Módulo_Recolección SHALL renderizar una tabla con las Columnas_Empresa (ID, Manufactor, App Name, Used for, License Group, License Level, # Users, Cost Monthly, End date, Subscription Path, Renewal Path, Cancellation Path, Information Type, SSO, Owner, Project or Corporate use) y las Columnas_Globant (Globant Studio, Eligible Y/N, GIST Approval, Action, Comments)
2. WHEN el Usuario accede a la Hoja "Compliance and Certifications" de una Empresa_Adquirida, THE Módulo_Recolección SHALL renderizar una tabla con las columnas: Norm/Certification, Scope, Issued by, Issued on, Due Date, Impact on, Associated cost, Renewal period
3. WHEN el Usuario edita una celda de una Hoja de Patrón_Inventario, THE Módulo_Recolección SHALL enviar la actualización al API_Backend y confirmar visualmente el guardado exitoso
4. THE Módulo_Recolección SHALL permitir agregar nuevas filas a una Hoja de Patrón_Inventario mediante un botón "Agregar fila"
5. THE Módulo_Recolección SHALL permitir eliminar filas existentes de una Hoja de Patrón_Inventario, solicitando confirmación antes de ejecutar la eliminación
6. WHEN la Hoja "Apps" es renderizada, THE Módulo_Recolección SHALL diferenciar visualmente las Columnas_Empresa de las Columnas_Globant mediante color de fondo o separador visual

### Requerimiento 7: Renderizado de Hojas — Patrón Cuestionario con Gestión

**User Story:** Como usuario del sistema, quiero ver y editar las hojas de tipo cuestionario con gestión (Infrastructure, IT Experience, MST) organizadas por categorías, para poder responder las preguntas de evaluación y gestionar el seguimiento.

#### Criterios de Aceptación

1. WHEN el Usuario accede a una Hoja de Patrón_Cuestionario_Gestión, THE Módulo_Recolección SHALL renderizar las preguntas agrupadas por Categoría, con un encabezado visual para cada Categoría
2. THE Módulo_Recolección SHALL renderizar cada pregunta con las columnas: # (ID), NAME (categoría), Phase/Stage, Type, Question (solo lectura), Columnas_Empresa (XX Answers) y Columnas_Globant (Globant Team comments, Globant owner, Due date, Comments)
3. WHEN el Usuario con Rol_Empresa edita el campo "XX Answers" de una pregunta, THE Módulo_Recolección SHALL enviar la actualización al API_Backend y confirmar visualmente el guardado exitoso
4. WHEN el Usuario con Rol_Globant edita los campos "Globant Team comments", "Globant owner", "Due date" o "Comments" de una pregunta, THE Módulo_Recolección SHALL enviar la actualización al API_Backend y confirmar visualmente el guardado exitoso
5. THE Módulo_Recolección SHALL renderizar la Hoja "Infrastructure" con las categorías definidas: Company Overview y las demás categorías presentes en los datos
6. THE Módulo_Recolección SHALL renderizar la Hoja "IT Experience" con las categorías: Devices, Architecture, People/Service Desk, Mobile, Logistics, Workplace Experience
7. THE Módulo_Recolección SHALL renderizar la Hoja "MST" con las categorías: ISP, Support Teams, Cloud, OS, Monitoring

### Requerimiento 8: Renderizado de Hojas — Patrón Cuestionario Simple

**User Story:** Como usuario del sistema, quiero ver y editar la hoja de Building Security en formato de cuestionario simple organizado por secciones, para poder documentar la seguridad física de cada oficina.

#### Criterios de Aceptación

1. WHEN el Usuario accede a la Hoja "Building Security" de una Empresa_Adquirida, THE Módulo_Recolección SHALL renderizar las preguntas agrupadas por Sección: "About the Building", "About the Office", "Support and Maintenance"
2. THE Módulo_Recolección SHALL renderizar cada pregunta con las columnas: Sección (solo lectura), Question (solo lectura), y Answer (editable)
3. WHEN el Usuario edita el campo "Answer" de una pregunta de Building Security, THE Módulo_Recolección SHALL enviar la actualización al API_Backend y confirmar visualmente el guardado exitoso
4. THE Módulo_Recolección SHALL renderizar la Hoja "Building Security" sin columnas de gestión Globant (sin Globant owner, Due date ni Comments adicionales)
5. WHEN la Hoja "Building Security" contiene datos para múltiples oficinas/sedes, THE Módulo_Recolección SHALL mostrar una columna de respuesta por cada oficina/sede registrada

### Requerimiento 9: Importación de Datos desde CSV

**User Story:** Como administrador del equipo I4G, quiero poder importar datos existentes desde archivos CSV exportados de Google Sheets, para migrar la información actual al nuevo sistema sin pérdida de datos.

#### Criterios de Aceptación

1. WHEN un Rol_Admin accede a la función de importación, THE Módulo_Recolección SHALL permitir seleccionar una Empresa_Adquirida destino y una Hoja destino para la importación
2. WHEN un Rol_Admin sube un archivo CSV, THE API_Backend SHALL parsear el archivo CSV validando que las columnas coincidan con la estructura esperada de la Hoja destino
3. IF el archivo CSV contiene columnas que no coinciden con la estructura de la Hoja destino, THEN THE API_Backend SHALL retornar un error descriptivo indicando las columnas no reconocidas
4. WHEN el parseo del CSV es exitoso, THE API_Backend SHALL insertar los datos en la SQLite_DB asociados a la Empresa_Adquirida y Hoja seleccionadas dentro de una transacción atómica
5. WHEN la importación se completa exitosamente, THE Módulo_Recolección SHALL mostrar un resumen con la cantidad de filas importadas y la Hoja destino
6. IF la importación falla durante la inserción en la SQLite_DB, THEN THE API_Backend SHALL revertir toda la transacción y retornar un error descriptivo al cliente
7. FOR ALL datos CSV válidos, importar y luego exportar los datos de la misma Hoja SHALL producir un CSV con contenido equivalente al original (propiedad round-trip)

### Requerimiento 10: Integración con la Aplicación Existente

**User Story:** Como usuario del I4G Integration Tracker, quiero que el módulo de recolección de datos se integre visualmente con la aplicación existente, para tener una experiencia de uso coherente y unificada.

#### Criterios de Aceptación

1. THE Módulo_Recolección SHALL reutilizar los tokens de diseño CSS existentes (colores, tipografía, espaciado, bordes, sombras) definidos en `css/tokens.css`
2. THE Módulo_Recolección SHALL reutilizar los componentes visuales existentes (botones, tablas, badges, tooltips) definidos en `css/components.css` y `js/presentation/components.js`
3. THE Módulo_Recolección SHALL soportar el Modo_Oscuro existente, adaptando todos sus elementos visuales a los tokens de tema oscuro definidos en `css/dark.css`
4. THE Módulo_Recolección SHALL funcionar como una sección adicional dentro del mismo `index.html`, cargada mediante el router hash existente sin requerir una página HTML separada
5. THE API_Backend SHALL extender el servidor Express existente en `proxy/server.js` agregando las rutas del Módulo_Recolección sin afectar las rutas existentes de autenticación Jira y datos
6. THE Módulo_Recolección SHALL seguir la arquitectura de 3 capas existente (Datos, Negocio, Presentación) para organizar su código JavaScript

### Requerimiento 11: API REST del Backend

**User Story:** Como desarrollador, quiero que el backend exponga una API REST clara y consistente para todas las operaciones del módulo, para poder construir el frontend de forma desacoplada y testeable.

#### Criterios de Aceptación

1. THE API_Backend SHALL exponer endpoints CRUD para empresas: listar todas, obtener por ID, crear, actualizar y eliminar
2. THE API_Backend SHALL exponer endpoints CRUD para usuarios: listar todos, obtener por ID, crear, actualizar y desactivar
3. THE API_Backend SHALL exponer endpoints para gestionar Asignaciones_Usuario_Empresa: listar asignaciones por usuario, listar asignaciones por empresa, crear asignación y eliminar asignación
4. THE API_Backend SHALL exponer endpoints para datos de Hojas: obtener datos de una Hoja por empresa, actualizar una fila de datos, agregar una fila, eliminar una fila
5. THE API_Backend SHALL exponer un endpoint de importación CSV que reciba el archivo y los parámetros de empresa y hoja destino
6. THE API_Backend SHALL retornar respuestas JSON con estructura consistente: `{ "ok": true, "data": ... }` para éxito y `{ "ok": false, "error": "mensaje" }` para errores
7. THE API_Backend SHALL validar todos los campos requeridos en las peticiones de creación y actualización, retornando error HTTP 400 con detalle de los campos faltantes o inválidos
8. FOR ALL entidades creadas mediante la API, obtener la entidad por ID inmediatamente después de crearla SHALL retornar una entidad equivalente a la enviada en la creación (propiedad round-trip)
