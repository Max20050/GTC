package config

import "os"

type Config struct {
	Port          string
	MongoURI      string
	DatabaseName  string
	PublicKeyPath string
}

func Load() *Config {
	return &Config{
		Port:          getEnv("PORT", "8082"),
		MongoURI:      getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DatabaseName:  getEnv("DB_NAME", "canvas_db"),
		PublicKeyPath: getEnv("PUBLIC_KEY_PATH", "keys/public.pem"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
