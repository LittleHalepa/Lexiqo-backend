ALTER TABLE refresh_tokens
ADD CONSTRAINT unique_token UNIQUE (token);