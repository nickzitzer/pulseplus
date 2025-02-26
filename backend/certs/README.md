# Database SSL/TLS Certificates

This directory contains SSL/TLS certificates for secure database connections.

## Certificate Files

The following certificate files are required for SSL/TLS connections:

- `ca.pem`: Certificate Authority (CA) certificate
- `client-key.pem`: Client private key
- `client-cert.pem`: Client certificate

## Generating Self-Signed Certificates for Development

For development purposes, you can generate self-signed certificates using OpenSSL:

```bash
# Generate CA key and certificate
openssl genrsa -out ca-key.pem 2048
openssl req -new -x509 -nodes -days 365 -key ca-key.pem -out ca.pem -subj "/CN=postgres-ca"

# Generate client key and certificate signing request
openssl genrsa -out client-key.pem 2048
openssl req -new -key client-key.pem -out client.csr -subj "/CN=postgres-client"

# Sign the client certificate with the CA
openssl x509 -req -in client.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out client-cert.pem -days 365
```

## Production Certificates

For production environments, use certificates issued by a trusted Certificate Authority (CA).

## Configuration

Update the `.env` file with the correct paths to your certificate files:

```
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA_PATH=./certs/ca.pem
DB_SSL_KEY_PATH=./certs/client-key.pem
DB_SSL_CERT_PATH=./certs/client-cert.pem
```

## PostgreSQL Server Configuration

Ensure your PostgreSQL server is configured to use SSL/TLS. In your `postgresql.conf` file:

```
ssl = on
ssl_cert_file = 'server-cert.pem'
ssl_key_file = 'server-key.pem'
ssl_ca_file = 'ca.pem'
```

And in your `pg_hba.conf` file, require SSL for connections:

```
hostssl all all 0.0.0.0/0 md5
```

## Verifying SSL/TLS Connection

You can verify that your connection is using SSL/TLS by running the following query:

```sql
SELECT ssl, client_addr, client_port FROM pg_stat_ssl JOIN pg_stat_activity ON pg_stat_ssl.pid = pg_stat_activity.pid;
``` 