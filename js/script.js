function startOS(){

    document.querySelector(".boot").style.display="none";

    document.querySelector(".os").style.display="block";

}


function openTerminal(){

    document.getElementById("screen").innerHTML = `

    ROBCO TERMINAL

    <br><br>

    Type commands:

    <br>

    HELP

    <br>
    STATUS

    <br>
    VAULT

    `;

}


function showSystem(){

    document.getElementById("screen").innerHTML = `

    SYSTEM INFORMATION

    <br><br>

    OS: Fallout OS v2.0

    <br>

    CPU: Vault-Tec Processor

    <br>

    MEMORY: 64GB

    <br>

    SECURITY: ACTIVE

    `;

}


function showVault(){

    document.getElementById("screen").innerHTML = `

    VAULT DATABASE

    <br><br>

    VAULT 101 - CLOSED

    <br>

    VAULT 111 - CRYOGENIC TESTING

    <br>

    VAULT 88 - EXPERIMENTAL

    `;

}
