# 🧪 Guía de Testing Funcional: Roles en ClassBack (v1.0.0)

Este documento detalla los permisos y capacidades de los dos roles principales en **ClassBack** para facilitar las pruebas QA (Aseguramiento de Calidad) funcionales de tu equipo de testers.

---

## 1. Rol: Administrador (Admin)
El Administrador es la figura de autoridad (por ejemplo: un Profesor, un Ayudante de Cátedra o un Creador de Contenido). Su función es orquestar los grupos de estudio y moderar la participación.

### Capacidades a Testear:
- **Creación de Clases**: Puede crear una clase asignando un `Nombre`, un `Código Único` y una `Contraseña`.
- **Eliminación de Clases**: Tiene el botón exclusivo para "Eliminar Clase". Al hacerlo, toda la base de datos asociada (espacios y mensajes) debe desaparecer.
- **Gestión de Espacios**: Dentro de su clase, es el único rol con un botón azul prominente para crear "Nuevos Espacios" (Ej: "Módulo 1", "Dudas", "Avisos").
- **Moderador Global del Chat**: En cualquier chat de los espacios dentro de su clase, el Administrador tiene el ícono de basura para **eliminar cualquier mensaje de cualquier alumno**.

---

## 2. Rol: Alumno (Estudiante)
El Alumno es el consumidor final, acotado a recibir información y chatear.

### Capacidades a Testear:
- **Unirse a Clases**: Solo puede interactuar usando el botón de "Unirse a clase", donde necesita colocar exactamente el `Código Único` y la `Contraseña` de un admin.
- **Limitación Estructural**: No debe ver el botón de "Crear Clase", "Eliminar Clase" o "Crear Espacio". Si lo ve, reportarlo como bug crítico UI.
- **Mensajería Aislada**: Puede participar, escribir y enviar mensajes en todos los espacios.
- **Edición Básica**: Solo debe aparecerle el ícono de "Basura" en sus **propios** mensajes. No debe poder borrar mensajes de otros alumnos ni del Administrador.

---

## 🚀 Flujo Recomendado de Test de Integración
Para que el equipo de testing valide el flujo completo, deben realizar este paso de a 2 personas (o con 2 pestañas, una en incógnito):

1. **El Tester A (Admin)** se registra. Crea la clase "Matemáticas" (Código: `MAT-01`, Pass: `123123`).
2. **El Tester A** entra a la clase y crea el espacio "Consultas Parcial". Luego escribe un mensaje: *"¡Hola chicos!"*
3. **El Tester B (Alumno)** se registra.
4. **El Tester B** usa Unirse, coloca `MAT-01` y `123123`.
5. **El Tester B** debe poder entrar a la clase, ver el espacio "Consultas Parcial" y ver el mensaje *"¡Hola chicos!"* sin poder borrarlo.
6. **El Tester B** responde: *"¡Entendido profe!"* y sí puede ver su propio tachito de basura para retractarse.
7. **El Tester A (Admin)** actualiza, ve el mensaje del alumno y hace click en borrar el mensaje del alumno (prueba de moderación). Debe desaparecer para ambos en tiempo real o al actualizar.
8. Por último, **El Tester A** sale al dashboard y elimina la clase "Matemáticas".
9. **El Tester B** navega por el sitio o actualiza y descubre que ya no tiene esa clase en su pantalla.