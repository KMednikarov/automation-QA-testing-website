@smoke
Feature: Atlas API starting point

Background:
  * url baseUrl

Scenario: Health is public
  Given path 'api', 'health'
  When method get
  Then status 200
  And match response == { status: 'ok' }

Scenario: An analyst can authenticate and read sales
  Given path 'api', 'auth', 'login'
  And request { email: 'analyst@atlas.test', password: 'Training123!' }
  When method post
  Then status 200
  * def token = response.access_token
  And match token == '#string'

  Given path 'api', 'auth', 'me'
  And header Authorization = 'Bearer ' + token
  When method get
  Then status 200
  And match response contains { email: 'analyst@atlas.test', role: 'analyst' }

  Given path 'api', 'sales'
  And header Authorization = 'Bearer ' + token
  And param page_size = 10
  When method get
  Then status 200
  And match response contains { items: '#array', total: '#number', page: 1, page_size: 10 }
  And match each response.items contains { id: '#number', region: '#string', revenue: '#number' }

  Given path 'api', 'auth', 'logout'
  And header Authorization = 'Bearer ' + token
  When method post
  Then status 204
