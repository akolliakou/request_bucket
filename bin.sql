CREATE TABLE bin (
  binID serial PRIMARY KEY,
  createdAt timestamp NOT NULL DEFAULT timezone('utc', now()),
  lastUsed timestamp NOT NULL DEFAULT timezone('utc', now()),
  requestCount int DEFAULT 0,
  binStatus varchar(255) DEFAULT 'active',
  binURL varchar(255) UNIQUE NOT NULL
);

CREATE TABLE request (
  requestID serial PRIMARY KEY,
  binID int,
  mongoRequestID varchar(255) UNIQUE NOT NULL,
  FOREIGN KEY (binID) REFERENCES bin(binID) ON DELETE CASCADE
);

INSERT INTO bin (binURL) VALUES (${endpoint})

