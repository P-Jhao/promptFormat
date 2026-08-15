#!/usr/bin/env node

/**
 * Module dependencies.
 */

import app from "../app.js";
import debugModule from "debug";
import http from "http";

const debug = debugModule("server:server");

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT ?? "7001");
const host = resolveHost(process.env.HOST);
app.set("port", port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 16 * 60 * 1000;

/**
 * Listen on provided port, on all network interfaces.
 */

if (typeof port === "string") {
  server.listen(port);
} else {
  server.listen(port, host);
}
server.on("error", onError);
server.on("listening", onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string): string | number {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  throw new Error(`Invalid port: ${val}`);
}

function resolveHost(value: string | undefined): string {
  const normalizedValue = value?.trim();
  return normalizedValue === undefined || normalizedValue.length === 0
    ? "0.0.0.0"
    : normalizedValue;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: NodeJS.ErrnoException) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address();
  const bind =
    typeof addr === "string" ? "pipe " + addr : "port " + (addr?.port || "");
  debug("Listening on " + bind);
  console.log(
    `Server is running at http://${host}:${
      typeof addr === "string" ? addr : addr?.port
    }`,
  );
}
