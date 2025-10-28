# Guía de Uso - Sistema de PODs con 3 Niveles de Acceso

Esta implementación soporta tres niveles de acceso según la visión del producto:

## 📋 Tipos de POD

### 1. **FREE** (Público)
- **Carpeta**: `/public/`
- **Acceso**: Público para todos (URI/URL indexable por bots)
- **Uso**: Documentos que quieres compartir públicamente

### 2. **COMMUNITY** (Comunidad)
- **Carpeta**: `/community/`
- **Acceso**: Usuarios registrados en la comunidad (studio + passport)
- **Uso**: Compartir con todos los usuarios de la plataforma

### 3. **PRIVATE** (Privado)
- **Carpeta**: `/private/`
- **Acceso**: Solo stakeholders específicos (network level 1)
- **Uso**: Documentos privados compartidos solo con personas específicas

---

## 🚀 Ejemplos de Uso

### Configuración Inicial

Asegúrate de tener tu archivo `.env` con las credenciales:

```env
SOLID_IDP=https://solidcommunity.net
SOLID_CLIENT_ID=tu_client_id
SOLID_CLIENT_SECRET=tu_client_secret
SOLID_WEBID=https://tuusuario.solidcommunity.net/profile/card#me
UPLOAD_TMP_DIR=./uploads
```

### Iniciar el servidor

```bash
npm run start:dev
```

---

## 📤 API Endpoints

### 1. Login al POD

```bash
POST http://localhost:3000/solid/login
```

**Respuesta:**
```json
{
  "message": "Logged in to Solid POD"
}
```

---

### 2. Subir archivo FREE (Público)

**Usando cURL:**
```bash
curl -X POST http://localhost:3000/solid/upload \
  -F "file=@curriculum_vitae.pdf" \
  -F "podType=free"
```

**Usando Postman/Insomnia:**
- Method: `POST`
- URL: `http://localhost:3000/solid/upload`
- Body: `form-data`
  - `file`: [seleccionar archivo]
  - `podType`: `free`

**Respuesta:**
```json
{
  "fileUrl": "https://tuusuario.solidcommunity.net/public/curriculum_vitae.pdf",
  "podType": "free",
  "accessLevel": "Public - Accessible by anyone (URI/URL indexable)"
}
```

**Casos de uso:**
- Curriculum vitae público
- Portfolio de proyectos
- Documentos de presentación de empresa

---

### 3. Subir archivo COMMUNITY (Compartido)

**Usando cURL:**
```bash
curl -X POST http://localhost:3000/solid/upload \
  -F "file=@job_description.pdf" \
  -F "podType=community"
```

**Usando Postman/Insomnia:**
- Method: `POST`
- URL: `http://localhost:3000/solid/upload`
- Body: `form-data`
  - `file`: [seleccionar archivo]
  - `podType`: `community`

**Respuesta:**
```json
{
  "fileUrl": "https://tuusuario.solidcommunity.net/community/job_description.pdf",
  "podType": "community",
  "accessLevel": "Community - Shared with all registered users"
}
```

**Casos de uso:**
- Job descriptions para la comunidad
- Documentos de proyectos compartidos
- Recursos de la empresa para empleados

---

### 4. Subir archivo PRIVATE (Stakeholders)

**Usando cURL:**
```bash
curl -X POST http://localhost:3000/solid/upload \
  -F "file=@confidential_project.pdf" \
  -F "podType=private" \
  -F 'stakeholderWebIds=["https://stakeholder1.solidcommunity.net/profile/card#me","https://stakeholder2.solidcommunity.net/profile/card#me"]'
```

**Usando Postman/Insomnia:**
- Method: `POST`
- URL: `http://localhost:3000/solid/upload`
- Body: `form-data`
  - `file`: [seleccionar archivo]
  - `podType`: `private`
  - `stakeholderWebIds`: `["https://stakeholder1.solidcommunity.net/profile/card#me","https://stakeholder2.solidcommunity.net/profile/card#me"]`

**Respuesta:**
```json
{
  "fileUrl": "https://tuusuario.solidcommunity.net/private/confidential_project.pdf",
  "podType": "private",
  "accessLevel": "Private - Shared only with specific stakeholders",
  "sharedWith": [
    "https://stakeholder1.solidcommunity.net/profile/card#me",
    "https://stakeholder2.solidcommunity.net/profile/card#me"
  ]
}
```

**Casos de uso:**
- Contratos con clientes específicos
- Documentos de proyectos confidenciales
- Información sensible de la empresa

---

## 🔐 Control de Acceso (Web Access Control)

La implementación usa **Web Access Control (WAC)** de Solid para gestionar permisos:

### Permisos por Tipo:

| Tipo | Público | Propietario | Stakeholders |
|------|---------|-------------|--------------|
| **FREE** | ✅ Lectura | ✅ Control total | N/A |
| **COMMUNITY** | ❌ | ✅ Control total | 🔄 (Configurable)* |
| **PRIVATE** | ❌ | ✅ Control total | ✅ Solo lectura |

\* Para COMMUNITY, puedes extender la implementación agregando WebIDs desde una base de datos.

---

## 🛠️ Integración desde Frontend

### Ejemplo con JavaScript/TypeScript:

```typescript
// Subir archivo FREE
async function uploadPublicFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('podType', 'free');

  const response = await fetch('http://localhost:3000/solid/upload', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}

// Subir archivo PRIVATE con stakeholders
async function uploadPrivateFile(file: File, stakeholders: string[]) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('podType', 'private');
  formData.append('stakeholderWebIds', JSON.stringify(stakeholders));

  const response = await fetch('http://localhost:3000/solid/upload', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}

// Uso
const file = document.querySelector('input[type="file"]').files[0];

// Público
const result1 = await uploadPublicFile(file);
console.log('Archivo público:', result1.fileUrl);

// Privado con stakeholders
const stakeholders = [
  'https://alice.solidcommunity.net/profile/card#me',
  'https://bob.solidcommunity.net/profile/card#me'
];
const result2 = await uploadPrivateFile(file, stakeholders);
console.log('Archivo privado:', result2.fileUrl);
console.log('Compartido con:', result2.sharedWith);
```

---

## 📝 Casos de Uso de Negocio

### 1. Curriculum Vitae (FREE)
```bash
curl -X POST http://localhost:3000/solid/upload \
  -F "file=@cv_juan_perez.pdf" \
  -F "podType=free"
```
→ URL pública que puedes compartir en LinkedIn, etc.

### 2. Job Description (COMMUNITY)
```bash
curl -X POST http://localhost:3000/solid/upload \
  -F "file=@senior_developer_position.pdf" \
  -F "podType=community"
```
→ Solo usuarios registrados en tu plataforma pueden verlo

### 3. Proyecto Confidencial (PRIVATE)
```bash
curl -X POST http://localhost:3000/solid/upload \
  -F "file=@acme_corp_contract.pdf" \
  -F "podType=private" \
  -F 'stakeholderWebIds=["https://ceo.acme.solidcommunity.net/profile/card#me","https://cto.acme.solidcommunity.net/profile/card#me"]'
```
→ Solo los stakeholders especificados pueden acceder

---

## 🔍 Verificación de Permisos

Para verificar que los permisos están correctamente configurados, puedes:

1. **FREE**: Abre la URL directamente en el navegador (sin autenticación)
2. **COMMUNITY**: Intenta acceder sin autenticación → debería denegar acceso
3. **PRIVATE**: Intenta acceder con un WebID no autorizado → debería denegar acceso

---

## 📚 Referencias

- [Solid Project](https://solidproject.org/)
- [Solid GitHub](https://github.com/solid/)
- [Inrupt SDK](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
- [Web Access Control](https://solidproject.org/TR/wac)

---

## ⚙️ Extensiones Futuras

### Para COMMUNITY:
Puedes extender el sistema para obtener usuarios de una base de datos:

```typescript
// En solid.service.ts
private async getCommunityUsers(): Promise<string[]> {
  // Conectar con tu base de datos
  // return await database.getCommunityWebIds();
  return [
    'https://user1.solidcommunity.net/profile/card#me',
    'https://user2.solidcommunity.net/profile/card#me',
  ];
}

// Luego en setCommunityAccess:
const communityUsers = await this.getCommunityUsers();
communityUsers.forEach(webId => {
  resourceAcl = setAgentResourceAccess(resourceAcl, webId, { 
    read: true,
    write: false,
    append: false,
    control: false,
  });
});
```

### Grupos de Stakeholders:
Puedes crear grupos predefinidos para simplificar:

```typescript
const STAKEHOLDER_GROUPS = {
  executives: [
    'https://ceo.company.net/profile/card#me',
    'https://cto.company.net/profile/card#me',
  ],
  developers: [
    'https://dev1.company.net/profile/card#me',
    'https://dev2.company.net/profile/card#me',
  ],
};

// Uso:
curl -X POST http://localhost:3000/solid/upload \
  -F "file=@technical_doc.pdf" \
  -F "podType=private" \
  -F "stakeholderGroup=developers"
```

---

## 🐛 Troubleshooting

### Error: "Not logged in to Solid POD"
```bash
# Primero hacer login
curl -X POST http://localhost:3000/solid/login
```

### Error: "Invalid WebID format"
Asegúrate de usar el formato completo:
```
https://username.solidcommunity.net/profile/card#me
```

### Error: "Permission denied"
Verifica que:
1. El archivo `.env` tenga las credenciales correctas
2. El usuario tiene permisos en el POD
3. Las carpetas `/public/`, `/community/`, `/private/` existen en el POD

---

¡Listo! Ahora tienes un sistema completo de gestión de archivos con 3 niveles de acceso en Solid POD. 🎉

