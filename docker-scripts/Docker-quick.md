🔧 **RESTART vs BUILD - Cuándo usar cada uno:**
-----------------------------------------------

### 📋 **RESTART (`docker-compose restart` o `npm run restart`)**

**Cuándo usar:**

-   ✅ Cambios en **código fuente** (archivos `.js`, `.mjs`, etc.)
-   ✅ Cambios en **variables de entorno** del [docker-compose.yml](vscode-file://vscode-app/c:/Users/oracl/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
-   ✅ Cambios en **configuración** ([package.json](vscode-file://vscode-app/c:/Users/oracl/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html), archivos de config)
-   ✅ El contenedor ya existe y solo necesitas reiniciarlo

**Lo que hace:**

-   Para el contenedor existente
-   Lo vuelve a iniciar con la misma imagen
-   **NO reconstruye** la imagen Docker

### 🏗️ **BUILD ([npm run build](vscode-file://vscode-app/c:/Users/oracl/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) o [npm run build:no-cache](vscode-file://vscode-app/c:/Users/oracl/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html))**

**Cuándo usar:**

-   ✅ Cambios en el **Dockerfile**
-   ✅ Cambios en **dependencias** ([package.json](vscode-file://vscode-app/c:/Users/oracl/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) - nuevos paquetes)
-   ✅ Cambios en **archivos copiados** durante el build
-   ✅ Cambios en **comandos de instalación** del Dockerfile
-   ✅ Primera vez que construyes el proyecto

**Lo que hace:**

-   Reconstruye completamente la imagen Docker
-   Instala dependencias nuevas
-   Aplica cambios del Dockerfile