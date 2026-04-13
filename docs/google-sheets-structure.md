# Estructura de Google Sheets — Datos de Integración por Empresa

## Contexto

Cada empresa integrada tiene su propio Google Sheet con múltiples hojas que recopilan información durante el proceso de integración I4G. Las hojas siguen patrones estructurales definidos.

## Hojas y Patrones

### 1. Apps (Tipo: Inventario)
Inventario de aplicaciones/licencias de la empresa.

**Columnas llenadas por la empresa:**
- ID
- Manufactor
- App Name
- This app is used for?
- License Group
- License Level
- # of Users
- Cost (Monthly)
- End date
- Suscription Path
- Renewal Path
- Cancellation Path
- Information Type (Public / Confidential / Sensitive / High Sensitive)
- SSO (Yes / No)
- Owner
- Project or Corporate use?

**Columnas llenadas por Globant:**
- Globant Studio
- Eligible Y/N
- GIST Approval
- Action
- Comments

### 2. Infrastructure (Tipo: Cuestionario con gestión)
Relevamiento de infraestructura IT.

**Columnas:**
- `#` (ID)
- NAME (categoría/área)
- Phase / Stage
- Type
- Question
- Globant Team comments *(Globant)*
- XX Answers *(Empresa)*
- Globant owner *(Globant)*
- Due date *(Globant)*
- Comments *(Globant)*

**Categorías:** Company Overview, etc.

### 3. IT Experience (Tipo: Cuestionario con gestión)
Relevamiento de experiencia IT, dispositivos, workplace.

**Columnas:** Misma estructura que Infrastructure.

**Categorías:** Devices, Architecture, People/Service Desk, Mobile, Logistics, Workplace Experience.

### 4. MST (Tipo: Cuestionario con gestión)
Relevamiento de redes, soporte, cloud, OS.

**Columnas:** Misma estructura que Infrastructure.

**Categorías:** ISP, Support Teams, Cloud, OS, Monitoring.

### 5. Building Security (Tipo: Cuestionario simple)
Relevamiento de seguridad física por oficina/sede.

**Columnas:**
- Sección (About the Building / About the Office / Support and Maintenance)
- Question
- Respuesta (por oficina)

*No tiene columnas de gestión Globant (owner, due date, comments).*

### 6. Compliance and Certifications (Tipo: Inventario)
Inventario de normas y certificaciones.

**Columnas:**
- Norm / Certification
- Scope
- Issued by
- Issued on
- Due Date
- Impact on
- Associated cost
- Renewal period

## Patrones identificados

| Patrón | Hojas | Estructura |
|--------|-------|-----------|
| Inventario | Apps, Compliance | Filas = items, Columnas = atributos |
| Cuestionario con gestión | Infrastructure, IT Experience, MST | Q&A + Globant owner/due date/comments |
| Cuestionario simple | Building Security | Q&A sin columnas de gestión |

## Modelo operativo

- **Un Sheet por empresa** (cada empresa integrada tiene su propio Google Sheet)
- **Dos roles de edición:** la empresa nueva llena sus columnas, Globant llena las suyas
- **Responsables:** uno o más usuarios de Globant son responsables por cada empresa
