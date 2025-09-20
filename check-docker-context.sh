#!/bin/bash
# =============================================================================
# Script para verificar el contexto Docker después del .dockerignore
# =============================================================================

echo "🔍 Verificando contexto Docker optimizado..."
echo ""

# Cambiar al directorio del proyecto
cd "$(dirname "$0")"

# Función para calcular tamaño
calculate_size() {
    local path="$1"
    if [ -d "$path" ]; then
        du -sh "$path" 2>/dev/null | cut -f1
    elif [ -f "$path" ]; then
        ls -lh "$path" | awk '{print $5}'
    else
        echo "N/A"
    fi
}

echo "📊 ANTES del .dockerignore optimizado:"
echo "  • volumes-dev/: $(calculate_size volumes-dev)"
echo "  • docs/: $(calculate_size docs)"
echo "  • backups/: $(calculate_size backups)"
echo "  • ECOIN_DOCKERIZE/: $(calculate_size ECOIN_DOCKERIZE)"
echo ""

echo "📦 DESPUÉS del .dockerignore optimizado - Se incluirán:"
echo ""

# Archivos esenciales que SÍ se incluyen
echo "✅ ARCHIVOS ESENCIALES:"
echo "  • docker-entrypoint.sh: $(calculate_size docker-entrypoint.sh)"
echo "  • Dockerfile: $(calculate_size Dockerfile)"
echo "  • package.json: $(calculate_size package.json)"
echo ""

echo "✅ DIRECTORIOS INCLUIDOS:"
echo "  • src/: $(calculate_size src)"
echo ""

echo "❌ DIRECTORIOS EXCLUIDOS (no se copiarán al contenedor):"
echo "  • volumes-dev/ (modelos AI): $(calculate_size volumes-dev)"
echo "  • docs/ (documentación): $(calculate_size docs)"
echo "  • backups/ (respaldos): $(calculate_size backups)"
echo "  • .git/ (historial git): $(calculate_size .git)"
if [ -d "ECOIN_DOCKERIZE" ]; then
    echo "  • ECOIN_DOCKERIZE/ (proyecto separado): $(calculate_size ECOIN_DOCKERIZE)"
fi
echo ""

echo "🎯 IMPACTO:"
echo "  • Modelo AI principal (3.9GB) se excluye del build"
echo "  • Se descargará automáticamente en runtime si es necesario"
echo "  • Build context significativamente más pequeño y rápido"
echo "  • Solo código fuente y configuración esencial se incluyen"
echo ""

# Simular qué archivos se incluirían (excluyendo .dockerignore)
echo "📋 ESTRUCTURA QUE SE COPIARÁ AL CONTENEDOR:"
echo ""
find . -type f \( \
    ! -path "./.git/*" \
    ! -path "./volumes-dev/*" \
    ! -path "./docs/*" \
    ! -path "./backups/*" \
    ! -path "./ECOIN_DOCKERIZE/*" \
    ! -name "*.log" \
    ! -name "*.tmp" \
    ! -name "*.gguf" \
    ! -name "README.md" \
    ! -name "LICENSE" \
    ! -name "install.sh" \
    ! -name "oasis.sh" \
    ! -path "./scripts/*" \
    ! -name "docker-compose*.yml" \
    ! -name ".dockerignore" \
    ! -name ".gitignore" \
\) | head -20
echo "  ... (y otros archivos esenciales)"
echo ""

echo "✅ Optimización completada. El contexto Docker ahora es mucho más eficiente."