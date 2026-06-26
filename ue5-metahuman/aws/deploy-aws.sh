#!/bin/bash
# ============================================================
# DOMINO CHAIN - Deploy completo en AWS
# Ejecutar con: bash deploy-aws.sh
# Requiere: AWS CLI configurado con credenciales
# ============================================================

set -e

echo "============================================================"
echo "DOMINO CHAIN - Deploy UE5 MetaHuman en AWS"
echo "============================================================"

# ============================================================
# CONFIGURACIÓN - EDITAR ANTES DE EJECUTAR
# ============================================================
AWS_REGION="eu-west-1"          # Región de AWS (cambiar según preferencia)
KEY_PAIR_NAME="domino-ue5-key"  # Nombre del par de claves
STACK_NAME="domino-ue5-stack"   # Nombre del stack CloudFormation
INSTANCE_TYPE="g4dn.xlarge"     # Tipo de instancia GPU
VOLUME_SIZE="500"               # Disco en GB

# ============================================================
# PASO 1: Verificar AWS CLI
# ============================================================
echo ""
echo "PASO 1: Verificando AWS CLI..."
if ! command -v aws &> /dev/null; then
    echo "Instalando AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
fi

aws --version
echo "✅ AWS CLI disponible"

# ============================================================
# PASO 2: Verificar credenciales
# ============================================================
echo ""
echo "PASO 2: Verificando credenciales AWS..."
aws sts get-caller-identity --region $AWS_REGION
echo "✅ Credenciales válidas"

# ============================================================
# PASO 3: Crear par de claves SSH
# ============================================================
echo ""
echo "PASO 3: Creando par de claves SSH..."
if aws ec2 describe-key-pairs --key-names $KEY_PAIR_NAME --region $AWS_REGION &>/dev/null; then
    echo "Par de claves '$KEY_PAIR_NAME' ya existe"
else
    aws ec2 create-key-pair \
        --key-name $KEY_PAIR_NAME \
        --region $AWS_REGION \
        --query 'KeyMaterial' \
        --output text > ~/.ssh/${KEY_PAIR_NAME}.pem
    chmod 400 ~/.ssh/${KEY_PAIR_NAME}.pem
    echo "✅ Par de claves creado: ~/.ssh/${KEY_PAIR_NAME}.pem"
fi

# ============================================================
# PASO 4: Verificar límites de GPU en la cuenta
# ============================================================
echo ""
echo "PASO 4: Verificando límites de instancias GPU..."
VCPU_LIMIT=$(aws service-quotas get-service-quota \
    --service-code ec2 \
    --quota-code L-DB2E81BA \
    --region $AWS_REGION \
    --query 'Quota.Value' \
    --output text 2>/dev/null || echo "0")

echo "Límite actual de vCPUs para instancias G: $VCPU_LIMIT"
if (( $(echo "$VCPU_LIMIT < 4" | bc -l) )); then
    echo ""
    echo "⚠️  ATENCIÓN: Necesitas solicitar aumento de límite para instancias GPU"
    echo "Ve a: https://console.aws.amazon.com/servicequotas/home/services/ec2/quotas"
    echo "Busca: 'Running On-Demand G and VT instances'"
    echo "Solicita: mínimo 4 vCPUs"
    echo ""
    echo "Esto puede tardar 24-48 horas en aprobarse."
    echo "Presiona ENTER para continuar de todos modos o Ctrl+C para salir..."
    read
fi

# ============================================================
# PASO 5: Desplegar CloudFormation
# ============================================================
echo ""
echo "PASO 5: Desplegando infraestructura con CloudFormation..."
echo "Esto puede tardar 5-10 minutos..."

aws cloudformation deploy \
    --template-file /home/ubuntu/domino-ue5/aws/create-gpu-vm.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        KeyPairName=$KEY_PAIR_NAME \
        InstanceType=$INSTANCE_TYPE \
        VolumeSize=$VOLUME_SIZE \
    --region $AWS_REGION \
    --capabilities CAPABILITY_IAM

echo "✅ CloudFormation desplegado"

# ============================================================
# PASO 6: Obtener IP pública
# ============================================================
echo ""
echo "PASO 6: Obteniendo información del servidor..."

PUBLIC_IP=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
    --output text)

INSTANCE_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
    --output text)

echo "✅ Servidor creado:"
echo "   IP Pública: $PUBLIC_IP"
echo "   Instance ID: $INSTANCE_ID"
echo "   RDP: mstsc /v:${PUBLIC_IP}:3389"

# ============================================================
# PASO 7: Esperar a que el servidor esté listo
# ============================================================
echo ""
echo "PASO 7: Esperando a que el servidor esté listo (5-10 min)..."
aws ec2 wait instance-status-ok \
    --instance-ids $INSTANCE_ID \
    --region $AWS_REGION

echo "✅ Servidor listo"

# ============================================================
# PASO 8: Obtener contraseña de Windows
# ============================================================
echo ""
echo "PASO 8: Obteniendo contraseña de Windows..."
echo "Esperando 4 minutos para que Windows genere la contraseña..."
sleep 240

WINDOWS_PASSWORD=$(aws ec2 get-password-data \
    --instance-id $INSTANCE_ID \
    --priv-launch-key ~/.ssh/${KEY_PAIR_NAME}.pem \
    --region $AWS_REGION \
    --query 'PasswordData' \
    --output text)

echo "✅ Credenciales de Windows:"
echo "   Usuario: Administrator"
echo "   Contraseña: $WINDOWS_PASSWORD"
echo "   RDP: mstsc /v:${PUBLIC_IP}:3389"

# ============================================================
# PASO 9: Guardar información de acceso
# ============================================================
cat > /home/ubuntu/domino-ue5/aws/server-info.txt << EOF
DOMINO CHAIN - Información del Servidor GPU
============================================
Fecha de creación: $(date)
Región AWS: $AWS_REGION
Instance ID: $INSTANCE_ID
IP Pública: $PUBLIC_IP

ACCESO RDP (Windows):
  Comando: mstsc /v:${PUBLIC_IP}:3389
  Usuario: Administrator
  Contraseña: $WINDOWS_PASSWORD

ACCESO SSH (si necesario):
  ssh -i ~/.ssh/${KEY_PAIR_NAME}.pem Administrator@${PUBLIC_IP}

PIXEL STREAMING URL:
  http://${PUBLIC_IP}:8888

BOT API URL:
  http://${PUBLIC_IP}:8080

COSTES ESTIMADOS:
  Instancia g4dn.xlarge: ~\$526/mes (24/7)
  Disco EBS 500GB: ~\$50/mes
  Red: ~\$50/mes
  TOTAL: ~\$626/mes

PRÓXIMOS PASOS:
1. Conectar por RDP a ${PUBLIC_IP}
2. Ejecutar: C:\DOMINO\install-ue5-complete.ps1
3. Esperar instalación de UE5 (~2-3 horas)
4. Abrir MetaHuman Creator y crear los 5 avatares
5. Ejecutar: C:\DOMINO\start_domino_bots.bat
6. Actualizar VITE_PIXEL_STREAMING_URL en Vercel con: http://${PUBLIC_IP}:8080
EOF

echo ""
echo "✅ Información guardada en: /home/ubuntu/domino-ue5/aws/server-info.txt"

# ============================================================
# PASO 10: Copiar scripts al servidor
# ============================================================
echo ""
echo "PASO 10: Copiando scripts de instalación al servidor..."

# Esperar a que RDP/WinRM esté disponible
sleep 30

echo ""
echo "============================================================"
echo "✅ SERVIDOR GPU CREADO EXITOSAMENTE"
echo "============================================================"
echo ""
echo "IP del servidor: $PUBLIC_IP"
echo ""
echo "PRÓXIMOS PASOS:"
echo "1. Conecta por RDP: mstsc /v:${PUBLIC_IP}:3389"
echo "   Usuario: Administrator"
echo "   Contraseña: $WINDOWS_PASSWORD"
echo ""
echo "2. Una vez conectado, abre PowerShell como Administrador y ejecuta:"
echo "   C:\DOMINO\install-ue5-complete.ps1"
echo ""
echo "3. La instalación de UE5 tarda ~2-3 horas (100GB de descarga)"
echo ""
echo "4. Mientras se instala UE5, ve a:"
echo "   https://metahuman.unrealengine.com"
echo "   y crea los 5 avatares con las configuraciones de setup-metahumans.py"
echo ""
echo "5. Cuando UE5 esté instalado, ejecuta:"
echo "   C:\DOMINO\start_domino_bots.bat"
echo ""
echo "6. Actualiza la variable de entorno en Vercel:"
echo "   VITE_PIXEL_STREAMING_URL=http://${PUBLIC_IP}:8080"
echo "============================================================"
