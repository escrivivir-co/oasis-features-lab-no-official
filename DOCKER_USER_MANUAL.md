# Setup

Create host folders so docker can map some "interesting" directories:

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized/volumes (feature/dockerize)
npm run setup

> oasis-dockerized@1.0.0 setup
> sh ./docker-scripts/setup.sh

Estructura de volúmenes creada:
- volumes/ssb-keys/     <- Llaves SSB (CRÍTICO - hacer backup)
- volumes/ssb-data/     <- Base de datos SSB
- volumes/ssb-blobs/    <- Archivos adjuntos
- volumes/ai-models/    <- Modelo GGUF de IA
- volumes/configs/      <- Configuraciones
- volumes/logs/         <- Logs de aplicación


secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized/volumes (feature/dockerize)
$ ls -la
total 0
drwxr-xr-x 1 secre 197609 0 Sep 17 14:12 .
drwxr-xr-x 1 secre 197609 0 Sep 16 21:23 ..
drwxr-xr-x 1 secre 197609 0 Sep 17 14:12 ai-models
drwxr-xr-x 1 secre 197609 0 Sep 17 14:12 configs
drwxr-xr-x 1 secre 197609 0 Sep 17 14:12 logs
drwxr-xr-x 1 secre 197609 0 Sep 17 14:12 ssb-blobs
drwxr-xr-x 1 secre 197609 0 Sep 17 14:12 ssb-data
drwxr-xr-x 1 secre 197609 0 Sep 17 14:12 ssb-gossip
drwxr-xr-x 1 secre 197609 0 Sep 17 14:12 ssb-keys
drwxr-xr-x 1 secre 197609 0 Sep 17 14:12 temp
```
# Build

Regenerate the container. Use no-cache if needed.

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ npm run build

secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ npm run logs

> oasis-dockerized@1.0.0 logs
> docker-compose logs -f

secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ sleep 10 && npm run logs

> oasis-dockerized@1.0.0 logs
> docker-compose logs -f

oasis-server  | ===============================
oasis-server  | || OASIS Dockerized AS v1.0 ||
oasis-server  | ===============================
oasis-server  | 📋 Verificando estructura de directorios...
oasis-server  | total 28
oasis-server  | drwxr-xr-x 1 oasis oasis 4096 Sep 17 13:27 .
oasis-server  | drwxr-xr-x 1 root  root  4096 Sep 17 13:27 ..
oasis-server  | -rw-r--r-- 1 oasis oasis  220 Jun  6 14:38 .bash_logout
oasis-server  | -rw-r--r-- 1 oasis oasis 3526 Jun  6 14:38 .bashrc
oasis-server  | drwxr-xr-x 4 oasis oasis 4096 Sep 17 13:27 .npm
oasis-server  | -rw-r--r-- 1 oasis oasis  807 Jun  6 14:38 .profile
oasis-server  | drwxrwxrwx 1 root  root   512 Sep 17 12:12 .ssb
oasis-server  |
oasis-server  | 📋 Verificando directorio SSB:
oasis-server  | total 772
oasis-server  | drwxrwxrwx 1 root  root   512 Sep 17 12:12 .
oasis-server  | drwxr-xr-x 1 oasis oasis 4096 Sep 17 13:27 ..
oasis-server  | drwxrwxrwx 1 root  root   512 Sep 17 12:13 blobs
oasis-server  | drwxrwxrwx 1 root  root   512 Sep 17 12:16 blobs_push
oasis-server  | -rwxrwxrwx 1 root  root   388 Sep 17 13:23 config
oasis-server  | -rwxrwxrwx 1 root  root     2 Sep 17 12:16 conn.json
oasis-server  | drwxrwxrwx 1 root  root   512 Sep 17 12:13 db
oasis-server  | drwxrwxrwx 1 root  root   512 Sep 17 12:16 flume
oasis-server  | -rwxrwxrwx 1 root  root     2 Sep 17 12:16 gossip.json
oasis-server  | -rwxrwxrwx 1 root  root     2 Sep 17 12:16 gossip_unfollowed.json
oasis-server  | -rwxrwxrwx 1 root  root  3536 Sep 17 13:23 manifest.json
oasis-server  | drwxrwxrwx 1 root  root   512 Sep 17 12:16 node_modules
oasis-server  | -r-xr-xr-x 1 root  root   869 Sep 17 12:16 secret
oasis-server  |
oasis-server  | 📋 Verificando modelo AI:
oasis-server  | total 3985412
oasis-server  | drwxrwxrwx 1 root  root         512 Sep 17 12:12 .
oasis-server  | drwxr-xr-x 1 oasis oasis       4096 Sep 17 13:27 ..
oasis-server  | -rwxrwxrwx 1 root  root  4081004224 Sep 17 12:16 oasis-42-1-chat.Q4_K_M.gguf
oasis-server  |
oasis-server  | 📋 Verificando permisos de usuario actual:
oasis-server  | oasis
oasis-server  | uid=999(oasis) gid=999(oasis) groups=999(oasis)
oasis-server  |
oasis-server  | ⚠ Ejecutando como usuario oasis - saltando cambios de permisos
oasis-server  | 🔍 Verificando modelo AI como usuario oasis...
oasis-server  | ✅ Modelo accesible en /app/src/AI/models/
oasis-server  | 🔍 Verificando integridad de la base de datos SSB...
oasis-server  |   ✅ db: Base de datos íntegra
oasis-server  |   ✅ blobs_push: Base de datos íntegra
oasis-server  |   ✅ flume-main: Base de datos íntegra
oasis-server  |   ✅ flume-search: Base de datos íntegra
oasis-server  | ✅ Base de datos SSB verificada - no se requiere recuperación
oasis-server  | Configuración SSB ya existe
oasis-server  | ✅ Modelo IA ya existe: /app/src/AI/models/oasis-42-1-chat.Q4_K_M.gguf
oasis-server  | Verificando dependencias críticas...
oasis-server  | Aplicando parches críticos a node_modules...
oasis-server  |   → Aplicando patch a ssb-ref...
oasis-server  |     ✓ ssb-ref patcheado exitosamente
oasis-server  |   → Aplicando patch a ssb-blobs...
oasis-server  |     ✓ ssb-blobs patcheado exitosamente
oasis-server  |   → Aplicando patch a multiserver unix-socket...
oasis-server  |     ✓ multiserver unix-socket patcheado exitosamente
oasis-server  | Parches aplicados.
oasis-server  | Configurando OASIS según disponibilidad del modelo IA...
oasis-server  |   → Modelo IA encontrado, habilitando IA en configuración...
oasis-server  |     ✓ aiMod: 'on'
oasis-server  |
oasis-server  | ✅ OASIS configurado correctamente!
oasis-server  |
oasis-server  | 🏠 HOME establecido como: /home/oasis
oasis-server  | 🔑 SSB_PATH establecido como: /home/oasis/.ssb
oasis-server  | 🚀 Iniciando servidor completo (SSB + Cliente)...
oasis-server  | =========================
oasis-server  | Running mode: OASIS GUI running at: http://localhost:3000
oasis-server  | =========================
oasis-server  | - Package: @krakenslab/oasis [Version: 0.4.9]
oasis-server  | - Logging Level: notice
oasis-server  | - Oasis ID: [ @msX7Hxg7rOH8JixdGKBh7c0tk2HP9Hc4XBFn35OoJzw=.ed25519 ]
oasis-server  |
oasis-server  | =========================
oasis-server  | Modules loaded: [ 1203 ]
oasis-server  | =========================
oasis-server  | =========================
oasis-server  | Warmup-time: 14.904ms
```

# Quit/Resume

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ npm run stop

> oasis-dockerized@1.0.0 stop
> docker-compose stop

[+] Stopping 1/1
 ✔ Container oasis-server  Stopped      
```

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ npm start

> oasis-dockerized@1.0.0 start
> docker-compose start

[+] Running 1/1
 ✔ Container oasis-server  Started     
 ```

# Dispose

All destroyed (but your host folders).

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ npm run down

> oasis-dockerized@1.0.0 down
> docker-compose down -v

[+] Running 5/5
 ✔ Container oasis-server                   Removed                                                                                      0.5s 
 ✔ Network oasis-network                    Removed                                                                                      0.6s 
 ✔ Volume oasis-dockerized_oasis-ssb-keys   Removed                                                                                      0.0s 
 ✔ Volume oasis-dockerized_oasis-ai-models  Removed                                                                                      0.0s 
 ✔ Volume oasis-dockerized_oasis-logs       Removed        
``` 

# Inspect Containers health

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ npm run status

> oasis-dockerized@1.0.0 status
> docker-compose ps && docker ps

NAME           IMAGE                    COMMAND                  SERVICE   CREATED         STATUS                            PORTS
oasis-server   oasis-dockerized-oasis   "/app/docker-entrypo…"   oasis     3 seconds ago   Up 3 seconds (health: starting)   0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp, 0.0.0.0:8008->8008/tcp, [::]:8008->8008/tcp
CONTAINER ID   IMAGE                    COMMAND                  CREATED         STATUS                            PORTS        NAMES
5316ab47ace6   oasis-dockerized-oasis   "/app/docker-entrypo…"   3 seconds ago   Up 3 seconds (health: starting)   0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp, 0.0.0.0:8008->8008/tcp, [::]:8008->8008/tcp   oasis-server
# List Dockerized processes

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ npm run top

SERVICE  #   UID  PID    PPID   C   STIME  TTY  TIME      CMD
oasis    1   999  23045  23022  0   13:05  ?    00:00:00  /bin/bash /app/docker-entrypoint.sh full
oasis    1   999  23140  23045  0   13:05  ?    00:00:00  node SSB_server.js start
oasis    1   999  23169  23045  0   13:05  ?    00:00:00  node backend.js --host 0.0.0.0
```

# Get a shell

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ npm run shell

> oasis-dockerized@1.0.0 shell
> docker-compose exec oasis /bin/bash

oasis@64a355a20b96:/app/src/server$ 
```

# Back up keys

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis-dockerized (feature/dockerize)
$ npm run backup-keys

> oasis-dockerized@1.0.0 backup-keys
> sh ./docker-scripts/backup-keys.sh

Backup de llaves creado: backups/20250917_153111.tar.gz
¡GUARDA ESTE ARCHIVO EN LUGAR SEGURO!
```
