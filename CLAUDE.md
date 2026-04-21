# CLAUDE.md — Servicio de Usuarios y Autenticación

## Resumen del Proyecto
Servicio central de Gestión de Identidad y Accesos (IAM) de la arquitectura. Maneja el registro de usuarios, la gestión de sesiones y proporciona claves públicas asimétricas para la autenticación distribuida. 
Está diseñado para alta concurrencia, utilizando `sqlc` para interacciones type-safe con la base de datos sin el overhead de un ORM tradicional, y Redis para un manejo ultrarrápido del estado de sesión.

## Stack Tecnológico
* **Lenguaje:** Go 1.23+
* **Framework Web:** [Gin Gonic](https://github.com/gin-gonic/gin)
* **Base de Datos:** PostgreSQL (Driver: `pgx/v5`)
* **Generador SQL:** `sqlc` (Consultas SQL puras a código Go type-safe)
* **Caché / Almacenamiento Rápido:** Redis (Lista negra de tokens, refresh tokens, rate limiting)
* **Autenticación:** JWT (RS256 - Firma Asimétrica)

## Comandos de Desarrollo y Construcción
* **Instalar Dependencias:** `go mod download`
* **Generar Código DB (sqlc):** `sqlc generate` (Ejecutar tras cada cambio en `sql/`)
* **Ejecutar Redis (Docker):** `docker run --name auth-redis -p 6379:6379 -d redis`
* **Ejecutar Base de Datos (Docker):** `docker run --name auth-pg -e POSTGRES_PASSWORD=secret -p 5432:5432 -d postgres`
* **Ejecutar Servidor en Desarrollo:** `go run cmd/server/main.go`
* **Compilar Binario:** `go build -o bin/auth-service ./cmd/server`
* **Migraciones de DB:** `migrate -path sql/schema -database $DATABASE_URL up`

## Estructura del Proyecto
```text
├── cmd/
│   └── server/              # Punto de entrada principal (main.go)
├── internal/
│   ├── user/                # Lógica de dominio de usuarios
│   ├── auth/                # Lógica de Auth (JWT, OAuth, Sesiones)
│   ├── transport/           # Handlers HTTP (Controladores Gin)
│   ├── repository/
│   │   └── db/              # ⚠️ Código autogenerado por sqlc (NO EDITAR)
│   └── middleware/          # Middlewares de Gin (Auth, Redis Blacklist)
├── pkg/
│   ├── database/            # Pool de conexiones Postgres (pgxpool)
│   ├── cache/               # Wrapper del cliente de Redis
│   └── tokens/              # Gestión de claves RSA y firma JWT
├── sql/
│   ├── schema/              # Archivos .sql de creación de tablas (DDL)
│   └── queries/             # Archivos .sql con consultas (DML) para sqlc
├── sqlc.yaml                # Configuración de sqlc
└── go.mod
```

Estilo de Código y Patrones de Arquitectura
1. Base de Datos (sqlc + pgx)
No utilizamos ORMs (como GORM). Toda la interacción con la base de datos se define en archivos .sql puros dentro de sql/queries/.

sqlc genera las interfaces y structs en internal/repository/db/.

Usar pgxpool para mantener un pool de conexiones concurrente y eficiente hacia PostgreSQL.

2. Uso de Redis
Lista Negra (Blacklist): Almacenar las claves jti (JWT ID) revocadas con un TTL que coincida con la expiración restante del token.

Rate Limiting: Usar una ventana deslizante en Redis para proteger los endpoints de autenticación contra fuerza bruta.

3. Autenticación Asimétrica y JWT
El servicio de Usuarios firma los JWT con una Clave Privada (RS256).

Expone la Clave Pública a los demás servicios (ej. agent-api, Boards) mediante el endpoint GET /v1/auth/.well-known/jwks.json.

Los payloads del JWT deben incluir identificadores estándar (sub, exp, iat, jti) y claims de autorización personalizados.

4. Concurrencia y Errores
Pasar siempre el context.Context desde el handler de Gin hasta las llamadas de sqlc y Redis para respetar los timeouts y cancelaciones de peticiones HTTP.

Envolver errores para trazabilidad: fmt.Errorf("error obteniendo usuario: %w", err).

Implementación del Middleware de Auth (Gin + Redis)
```go
func AuthMiddleware(publicKey *rsa.PublicKey, rdb *redis.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(401, gin.H{"error": "Falta el token de autorización"})
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
            if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
                return nil, fmt.Errorf("método de firma criptográfica no válido")
            }
            return publicKey, nil
        })

        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(401, gin.H{"error": "Token inválido o expirado"})
            return
        }

        claims, _ := token.Claims.(jwt.MapClaims)
        jti := claims["jti"].(string)

        // Verificar Lista Negra en Redis
        ctx := c.Request.Context()
        exists, _ := rdb.Exists(ctx, "blacklist:"+jti).Result()
        if exists > 0 {
            c.AbortWithStatusJSON(401, gin.H{"error": "Token revocado"})
            return
        }

        c.Set("user_id", claims["sub"])
        c.Next()
    }
}
```
---



### 2. Configuration & SQL Files

To make this immediately runnable, here are the foundational files for your database layer. 

**`sqlc.yaml`** (Place in the root of your project)
```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "sql/queries/"
    schema: "sql/schema/"
    gen:
      go:
        package: "db"
        out: "internal/repository/db"
        sql_package: "pgx/v5"
        emit_json_tags: true
        emit_prepared_queries: false
        emit_interface: true
        emit_exact_table_names: false
sql/schema/001_users.sql (Your database schema)
```

SQL
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
sql/queries/users.sql (The raw queries sqlc will convert into Go code)

```SQL
-- name: CreateUser :one
INSERT INTO users (id, email, password_hash) 
VALUES ($1, $2, $3) 
RETURNING id, email, created_at;

-- name: GetUserByEmail :one
SELECT id, email, password_hash, created_at, updated_at
FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT id, email, created_at, updated_at
FROM users
WHERE id = $1 LIMIT 1;

-- name: UpdateUserPassword :exec
UPDATE users
SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1;
Once you run sqlc generate, it will create a Querier interface inside internal/repository/db/ that allows you to call these methods perfectly typed directly from your services.
```
