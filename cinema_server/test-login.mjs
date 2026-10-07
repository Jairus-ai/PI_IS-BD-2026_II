const email = 'admin.prueba@cinepi.com';
const password = 'Cine!Prueba#2026';

const res = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

console.log('STATUS:', res.status);
const text = await res.text();
console.log(text.slice(0, 2000));
console.log('COOKIE:', res.headers.get('set-cookie'));
