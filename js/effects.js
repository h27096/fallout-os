function screenStatic(){

    document.body.style.opacity=".92";

    setTimeout(()=>{

        document.body.style.opacity="1";

    },80);

}

setInterval(screenStatic,5000);
