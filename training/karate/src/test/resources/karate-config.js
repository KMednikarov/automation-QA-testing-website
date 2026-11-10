function fn() {
  karate.configure('connectTimeout', 5000);
  karate.configure('readTimeout', 10000);
  return { baseUrl: karate.properties['baseUrl'] || 'http://127.0.0.1:8000' };
}
