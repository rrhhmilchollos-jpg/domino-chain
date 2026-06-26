/**
 * DOMINO Analytics Middleware
 * Monitorea el tráfico de endpoints clave:
 * - /api/videos/feed
 * - Tiempos de respuesta
 * - Conteo de requests
 * - Errores
 */

// Almacenamiento en memoria de métricas (se resetea al reiniciar)
const metrics = {
  feed: {
    totalRequests: 0,
    successRequests: 0,
    errorRequests: 0,
    totalResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    avgResponseTime: 0,
    lastHour: [],       // últimas requests (timestamp + responseTime)
    statusCodes: {},    // conteo por código HTTP
    startedAt: new Date().toISOString(),
  },
  global: {
    totalRequests: 0,
    byEndpoint: {},
    startedAt: new Date().toISOString(),
  },
};

// Limpiar métricas de la última hora cada 5 minutos
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  metrics.feed.lastHour = metrics.feed.lastHour.filter(r => r.ts > oneHourAgo);
}, 5 * 60 * 1000);

/**
 * Middleware de analytics para el feed de videos
 */
function feedAnalytics(req, res, next) {
  const start = Date.now();

  // Interceptar el final de la respuesta
  const originalEnd = res.end.bind(res);
  res.end = function (...args) {
    const responseTime = Date.now() - start;
    const statusCode = res.statusCode;

    // Actualizar métricas del feed
    metrics.feed.totalRequests++;
    metrics.feed.totalResponseTime += responseTime;

    if (statusCode >= 200 && statusCode < 400) {
      metrics.feed.successRequests++;
    } else {
      metrics.feed.errorRequests++;
    }

    if (responseTime < metrics.feed.minResponseTime) {
      metrics.feed.minResponseTime = responseTime;
    }
    if (responseTime > metrics.feed.maxResponseTime) {
      metrics.feed.maxResponseTime = responseTime;
    }

    metrics.feed.avgResponseTime = Math.round(
      metrics.feed.totalResponseTime / metrics.feed.totalRequests
    );

    metrics.feed.statusCodes[statusCode] = (metrics.feed.statusCodes[statusCode] || 0) + 1;

    // Guardar en historial de última hora
    metrics.feed.lastHour.push({
      ts: Date.now(),
      responseTime,
      statusCode,
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
    });

    // Métricas globales
    metrics.global.totalRequests++;
    const endpoint = `${req.method} /api/videos/feed`;
    metrics.global.byEndpoint[endpoint] = (metrics.global.byEndpoint[endpoint] || 0) + 1;

    return originalEnd(...args);
  };

  next();
}

/**
 * Middleware global para contar requests por endpoint
 */
function globalAnalytics(req, res, next) {
  metrics.global.totalRequests++;
  const key = `${req.method} ${req.path}`;
  metrics.global.byEndpoint[key] = (metrics.global.byEndpoint[key] || 0) + 1;
  next();
}

/**
 * Obtener métricas del feed
 */
function getFeedMetrics() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const lastHourRequests = metrics.feed.lastHour.filter(r => r.ts > oneHourAgo);
  const last5MinRequests = metrics.feed.lastHour.filter(r => r.ts > Date.now() - 5 * 60 * 1000);

  const avgLast5Min = last5MinRequests.length > 0
    ? Math.round(last5MinRequests.reduce((s, r) => s + r.responseTime, 0) / last5MinRequests.length)
    : 0;

  return {
    ...metrics.feed,
    lastHourCount: lastHourRequests.length,
    last5MinCount: last5MinRequests.length,
    avgResponseTimeLast5Min: avgLast5Min,
    requestsPerMinute: last5MinRequests.length > 0
      ? (last5MinRequests.length / 5).toFixed(2)
      : '0.00',
    minResponseTime: metrics.feed.minResponseTime === Infinity ? 0 : metrics.feed.minResponseTime,
    uptime: Math.round((Date.now() - new Date(metrics.feed.startedAt).getTime()) / 1000),
  };
}

/**
 * Obtener métricas globales
 */
function getGlobalMetrics() {
  return {
    ...metrics.global,
    uptime: Math.round((Date.now() - new Date(metrics.global.startedAt).getTime()) / 1000),
    topEndpoints: Object.entries(metrics.global.byEndpoint)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count })),
  };
}

module.exports = { feedAnalytics, globalAnalytics, getFeedMetrics, getGlobalMetrics };
