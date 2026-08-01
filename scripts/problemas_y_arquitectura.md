---
type: media-script
producer: oriel
status: draft
created: 2026-07-27T13:04:56.090Z
updated:
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Problemas Y Arquitectura

## Problemas

### Clientes olvidadisos

Muchos asegurados tienden a olvidarse de abonar su seguro, la gente no entiende
o le tiene miedo a los debitos automaticos y entonces elije ir a pagar
directamente a la agencia

### Mala elección del canal

Algunas aseguradoras tienen notificaiconesviamail para
caidas de cobertura por impago o renovaciones pero muchos
asegurados ignoran los mails directamente, no estan acostumbrados
a usarlo como canal habitual

### Caida de coberturas y perdida de comisiones

Al olvidarse de los pagos y no ser informados, muchos asegurados pueden caer en perdidas
de cobertura, se acuerdan tarde que tenìan que pagar o solo cuadno
van a viajar y al final ya tienen la poliza vencida

Esto genera tambièn  una  cierta inestabilidad en los  ingresos del PAS
porque Pepe puede olvidarse de pagar un mes, acordarse el otro y asì

### Necesidad de seguimiento manual

Esto empuja a los productores a tener que hacer de alarma mediante un
medio  màs a fin a sus clientes y andar... che pepito, se vence tu seguro mañana u hoy y veo que no abonaste pasa por la agencia
o te quedas sin cobertura desde x hora, cargando con tareas
operativas repetitivas

### Multiples compañias

Un PAS puede trabajr con cuantas compañias quiera o necesite, ya que cada
una ofrece productos distitnos y este recomienda en base a necesidades la
que mejor le venga al asegurado

Ahora el funcionamiento interno de las compañias no esta "estandarizao" y cada
una tiene su propio sistema para emitir polizas, registrar pagos, siniestros y
hasta las mismas polizas varian dentre compañias, teniendo cada una su 
propio formato

Esto deriba en que los productores necesiten en muchos casos un sistema por fuera
del de la aseguradora para gestionar su cartera de clientes de forma cecntralizada

Estos sistemas existen desde los mas rudimentarios como anotadores con:

| Fecha | Cliente | Numero |
| ------------- | -------------- | -------------- |
| 05/07 | Juan Perez | 3718556633 |

Hasta excels con formatos similares o inclusive sistemas informaticos que tambièn
permiten llevar el registro

### Fricción en los sitemas

Si bien existen software para manejar la  cartera, algunos
sistemas al ser el sector seguros, algo tradicional, regulado y 
bastante corpo, lo que hay no suele estar muy actualizado y  tieien:
- Interfaces poco amigables
- UX pensada por gente de sistemas y no por PAS
Tambièn suelen requerir la  carga  de datos de forma manual en muchos casos

### Falta de automatización

Estos software no suelen pasar mas alla de ser meros centralizadores
de carteras, pasando a ser un dashboard mas que los PAS visitan en lugar
de se una herramienta que facilita algo, son Software as a Service y no
Service as a Software

## Soluciones propuestas

### Notificaiones automaticas provistas por el PAS

En lugar de depender de la compañia, que sea el PAS
quien provea esta notifiacion automatica para sus  clientes

### Usar el canal que la gente ya usarlo

Abandonar el mail por algo que la gente ya usa, segùn estudios
en latam, email es preferido apra cosas formales, envio de facturas
texto largo, sms para operaiones transaccionales sin bidireccionaldiad
whatsapp es el canal preferido por los clientes  finales, por su
cercania, a su vez se percibe como confiable

### Facilitar la ingesta de datos

En lugar de tener que hacer uso de un formulario de carga, o
sistemas de OCR que pueden fallar, delegar la extracción de datos
a LLMs multimodales, un estractor y un revisor los cuales podrian
trabajr directamnte con el PDF de la poliza y dar ya una pre carga a
los PAS bastante cercana

### Automatizaicón de tareas

Mediante crone jobs o triggers se podrìa automatizar el envio de mensajes
utilizando una plantilla standard para todos los mensajesl ahorrando est 
trabajo manual

## Como se aplican estas soluciones

### Carga de datos

Hay difentes alternativas descartando desde ya la carga manual;
- Directo desde la API: las aseguradoras no tienen apis publicas
tampoco hay una _api universal_ lo que obliga a que si te dan la api
adaptar el sistema a cada compañia, algo lento
- Scraping web tradicinal: requiere que el PAS da las credenciales
para acceder al sistema de la compañia en su nombre, anque es optimo
porque permite  incoproar mas funciones, es fragil porque un cambioen la web 
puede romper todo
- Carga emdainte LLMS: usar modelos multimodales para extraer la data
directamente  de las polizas, funcionalideslimitadas pero baja complejidad
de implemntación y poca friccion para el PAS, solo tiene que cargar la poliza
en el sistema (subir el archivo) y se procesa solo
- Scraping con LLM: la mejor alternativa  porque el LLM entiende
la websematicmanete, y si le cambian algo de  lugar se adpata, el unico
problema podrìa ser la incorporación de captchas

Teniendo en cuenta esto, laopcion por la ual yo me decnatarìa en  un principio es el uso de LLMs para extraer datos
de los pdfs directmante, usando la siguiente estrategia

Tener dos modelos, un estractor  y un revisor cuyo objetivo es competir, 
permitiendo asì reduir la tasa de fallos

- LLM 1: su tarea es extraer datos de las polizas con la menor tasa de error posible
- LLM 2: rival del llm1, su funcion es encontrar los posibles errores en la estraccion 

Estos LLMS ambos deben ser multimodales, y nonecesariametneser el
mismo modelo, lo importante es que haya rivaldiad entre ellos

Aun asì el scrpaing web esta geial pero para mas adelnate, no  ahoraV
por complejidad de implemntación (gestion de credenciales, entornos de ejecucion)

### Herramienta de revision humana

A pesar de el uso de los LLMS, serìa lo  mejor incoporar observabildiad  
y revisiores humanos (los propios PAS) que validen la información en un principio
para asì optimizar los modelos en caso de ser necesario

### Almacenamiento de datos

los datos obtenidos por llm, recibidos d manera  estructurada serìan
almacenados en und DB para su consulta

### Notificaiones automatica:

Mediante el uso de Cron Jobs un servicio  pude recorrer la base de datos
todos  los dìas en  determinado horario, y a partir de los resultados
ya filtrados por fecha avisar a los asegurados
que su poliza vence ese dia, a aprtir de los crone jobs
son configurables distintas  notificaiones:
- X dìas antes por ejemplo

### Gestion y manejo

Se debe proveer un dashboard que permita a los PAS ver  su cartera;
centrado totalemtne en la operativa  dirìa y cuya interfaz sea simple
una vista del dìa con venciinetos y compañia, una consulta ya preparada
desde el back, y otra vista que muestre todos los asegurados, permiteindo filtros

@@@ Colas

Se puede incoporar para estos procesos; uso de colas de mensajerìa para
procesar la poliza, bajando costos de consumo, asì como colas
para el envio de las notiicaiones de mensajes




