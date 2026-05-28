async function test() {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ phone: '0901234567', password: 'password123' })
  })
  const data = await res.json()
  console.log('Login:', data)
  
  if (data.access_token) {
    const res2 = await fetch('http://localhost:3001/api/utility/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + data.access_token
      },
      body: JSON.stringify({
        roomId: 1, currentElectricity: 10, currentWater: 10, month: 1, year: 2026
      })
    })
    console.log('Utility:', await res2.json())
  }
}
test()
