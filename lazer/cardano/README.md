# Proof Of Pyth or Pay With Pyth

Tenemos 2 agentes: alguien que paga y alguien que recibe la plata. Asumimos que el que paga tiene plata suficiente en todo momento. El usuario es el que recibe la plata, el que paga lo vamos a tratar como una sponsor wallet. 

El usuario se loguea con Ethernal/Metamask/Lace/Loquesea

El usuario hace una request de fondos (boton "cobrar") con un monto en USD, una descripcion y fecha limite
El que paga acepta la request. Esto significa que necesitamos 2 pantallas, una para el sponsor y otra para el usuario.

Aceptar la request significa que el sponsor lockea suficiente ADA (con margen) para el usuario en un script. Este script lo que hace es:
* Al momento de ejecutarse, verifica con pyth el valor del dolar
* Hace la cuenta de cuantos ada tiene que transferir al usuario
* Transfiere los ADA al usuario
* Devuelve el resto, si sobra, al sponsor
  * Si no alcanza le manda todo lo que se lockeo al usuario