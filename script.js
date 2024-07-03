const express = require("express");
const cors = require("cors");
const app = express();
var CryptoJS = require("crypto-js");

const PORT = 3000; //Puerto en que estará ejecutando el servidor

app.use(express.json()); // Middleware para analizar JSON en las solicitudes
app.use(express.text({ type: "application/xml" }));

// Enable CORS
app.use(cors());

//Convertir de texto a JSON--------------------------------------------------------------------------------
app.post("/txt-json", (req, res) => {
  const { text } = req.body; // Obtener la cadena de texto del cuerpo de la solicitud
  if (!text) {
    return res
      .status(400)
      .json({ error: 'El cuerpo JSON debe contener la propiedad "text"' });
  }

  // Dividir el texto por líneas
  const lineas = text.split("\n");

  // Inicializar la lista de resultados
  let listaResultado = [];

  // Posibles separadores
  let posiblesSeparadores = [",", ";", "|"];

  lineas.forEach((linea) => {
    let separadorEncontrado = null;

    // Encontrar el separador adecuado
    for (let sep of posiblesSeparadores) {
      let partes = linea.split(sep);
      if (partes.length > 1) {
        separadorEncontrado = sep;
        break;
      }
    }

    let nombre = "";
    let tarjeta = "";

    // Dividir la cadena por comas
    let valores = linea.split(",");

    // Quitar las comillas dobles o simples de cada valor
    let valoresSinComillas = valores.map((valor) =>
      valor.replace(/['"]+/g, "")
    );

    // Unir los valores sin comillas en una nueva cadena
    let textoSinComillas = valoresSinComillas.join(",");

    const objetos = textoSinComillas.split(separadorEncontrado);
    let coordenadas = [];

    if (separadorEncontrado == null) {
      return res.status(401).json({
        error:
          "Atributo separador no detectado dentro de los permitidos: {',',';','|'}",
      });
    }

    if (objetos.length === 1) {
      nombre = objetos[0];
    } else if (objetos.length === 2) {
      nombre = objetos[0];
      tarjeta = objetos[1];
    } else {
      nombre = objetos[0];
      tarjeta = objetos[1];

      for (let i = 2; i < objetos.length; i += 2) {
        let latitud = objetos[i];
        let longitud = objetos[i + 1];
        if (latitud !== undefined && longitud !== undefined) {
          // Crear un objeto con atributos latitud y longitud
          let objetoCoordenada = {
            latitud: latitud,
            longitud: longitud,
          };
          // Añadir el objeto a la lista de coordenadas
          coordenadas.push(objetoCoordenada);
        }
      }
    }

    // Cifrar la tarjeta utilizando cryptoJs y la clave secreta
    const encryptedCard = CryptoJS.AES.encrypt(
      tarjeta,
      req.body.keyWord
    ).toString();

    tarjeta = encryptedCard;

    // Crear el objeto resultado
    let resultado = {
      nombre: nombre,
      tarjeta: tarjeta,
      coordenadas: coordenadas,
    };

    // Añadir el objeto a la lista de resultados
    listaResultado.push(resultado);
  });

  // Retornar la lista de resultados
  res.json(listaResultado);
});

// Convierte el JSON a TXT ----------------------------------------------------------------------------

app.post("/json-txt", (req, res) => {
  const { text } = req.body;

  //Try Catch para evitar body con formato erroneo
  try {
    if (!req.body.separator) {
      return res.status(401).json({ error: "Atributo separador no presente" });
    }

    if (!req.body.keyWord) {
      return res.status(401).json({ error: "Atributo keyWord no presente" });
    }

    const keyword = req.body.keyWord;
    const separator = req.body.separator; // Cambia el separador según tus necesidades

    let resultadoTexto = "";

    // Procesar cada objeto en la lista de valores dentro de text
    text.forEach((valor, index) => {
      if (!valor.nombre || !valor.tarjeta || !valor.coordenadas) {
        return res.status(401).json({ error: "Falta un atributo en el objeto" });
      }

      const nombre = valor.nombre;
      const tarjeta = valor.tarjeta;
      const coordenadas = valor.coordenadas;

      let textoCoordenadas = [];

      // Iterar a través de la lista de objetos de coordenadas
      for (let i = 0; i < coordenadas.length; i++) {
        let latitud = coordenadas[i].latitud;
        let longitud = coordenadas[i].longitud;
        // Añadir la latitud y longitud al array de textoCoordenadas
        textoCoordenadas.push(latitud);
        textoCoordenadas.push(longitud);
      }

      // Convertir el array de textoCoordenadas en una cadena de texto
      let textoCoordenadasStr = textoCoordenadas.join(separator);

      const decryptedCard = CryptoJS.AES.decrypt(tarjeta, keyword).toString(
        CryptoJS.enc.Utf8
      );
      if (decryptedCard === "") {
        return res.status(401).json({ error: "Clave incorrecta" });
      }

      const tarjeta_decrypted = decryptedCard;
      let texto_respuesta =
        nombre + separator + tarjeta_decrypted + separator + textoCoordenadasStr;

      // Añadir el texto_respuesta al resultadoTexto
      resultadoTexto += texto_respuesta;

      // Añadir un salto de línea si no es el último elemento
      if (index < text.length - 1) {
        resultadoTexto += '\n';
      }
    });

    res.send(resultadoTexto);
  } catch (error) {
    return res
      .status(400)
      .json({ error: "El objeto JSON no es válido", errorDetails: error });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
