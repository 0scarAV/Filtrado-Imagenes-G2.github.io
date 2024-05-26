// Trayendo los elementos HTML a JavaScript
const [img_original, img_filtrada, filtro_seleccionado] = ['imagen_original', 'imagen_filtrada', 'filtro'].map(id => document.getElementById(id));
const [context_img_original, context_img_filtrada] = [img_original, img_filtrada].map(img => img.getContext('2d'));

// Inicialización de la variable que guardará la imagen
let imageUploaded = new Image();

// Función que permite descargar la imagen filtrada
const downloadCanvas = () => {
    const link = document.createElement('a');
    link.download = 'imagen_filtrada.png';
    link.href = img_filtrada.toDataURL('image/png', 1.0).replace('image/png', 'image/octet-stream');
    link.click();
};

// Función que permite traer a JavaScript la imagen que subimos a la página
document.querySelector('#image_input').addEventListener('change', function () {
    const reader = new FileReader();
    reader.onload = () => { imageUploaded.src = reader.result; };
    reader.readAsDataURL(this.files[0]);
});

// Una vez que la imagen ya se guardó en JavaScript se dibuja en el canvas img_original_canvas
imageUploaded.onload = () => {
    [img_original.width, img_original.height, img_filtrada.width, img_filtrada.height] = 
        [imageUploaded.width, imageUploaded.height, imageUploaded.width, imageUploaded.height];
    context_img_original.filter = 'grayscale(1)';
    context_img_original.drawImage(imageUploaded, 0, 0, imageUploaded.width, imageUploaded.height);
};

// Esta función elimina los valores que no nos interesan (red, green, blue, alpha)
// y pasa solo los valores que nos interesan (escala de grises)
function convertTomatrix(pixels) {
    return Array.from({ length: imageUploaded.height }, (_, i) =>
        Array.from({ length: imageUploaded.width }, (_, j) => pixels[(i * imageUploaded.width + j) * 4])
    );
}

// Esta función pasa la matriz de valores en escala de grises a los valores (red, green, blue) para poder crear la nueva imagen
function convertToPixels(matrix, pixels) {
    let x = 0;
    matrix.flat().forEach(value => {
        pixels[x] = pixels[x + 1] = pixels[x + 2] = value;
        x += 4;
    });
}

// Esta función devuelve el pixel en una cierta coordenada(x,y) y los pixeles vecinos
function getValues(matrix, x, y, matrixSize, addO = true) {
    let values = [], aux = Math.floor(matrixSize / 2);
    for (let i = 0; i < matrixSize; i++) {
        for (let j = 0; j < matrixSize; j++) {
            let yi = y - aux + i, xj = x - aux + j;
            values.push((yi < 0 || yi >= matrix.length || xj < 0 || xj >= matrix[0].length) ? 0 : matrix[yi][xj]);
        }
    }
    return values;
}

// Función para inicializar una matriz con las mismas dimensiones de la original
const crearMatrizVacia = matrix => matrix.map(row => row.slice());

// Función utilitaria para aplicar una máscara
function aplicarMascara(matrix, x, y, mascara, divisor = 1, esMedia = false) {
    let values = getValues(matrix, x, y, mascara.length);
    let suma = mascara.flat().reduce((acc, num, i) => acc + num * values[i], 0);
    return esMedia ? Math.round(suma / divisor) : Math.round(suma);
}

/* ------------------------- FILTROS ------------------------- */

// MEDIANA
function filtroMediana(matrix, matrixSize) {
    let matrixCopia = crearMatrizVacia(matrix);
    matrix.forEach((row, y) => row.forEach((_, x) => {
        let values = getValues(matrix, x, y, matrixSize, false).sort((a, b) => a - b);
        matrixCopia[y][x] = values.length % 2 === 0 ?
            Math.round((values[values.length / 2] + values[values.length / 2 - 1]) / 2) :
            values[Math.floor(values.length / 2)];
    }));
    return matrixCopia;
}

// MEDIA
function filtroMedia(matrix, mascara, divisor) {
    let matrixCopia = crearMatrizVacia(matrix);
    matrix.forEach((row, y) => row.forEach((_, x) => {
        matrixCopia[y][x] = aplicarMascara(matrix, x, y, mascara, divisor, true);
    }));
    return matrixCopia;
}

// LAPLACIANO Y SOBEL
function filtroLaplaSobel(matrix, mascara) {
    let matrixCopia = crearMatrizVacia(matrix);
    let mayor = Number.MIN_SAFE_INTEGER, menor = Number.MAX_SAFE_INTEGER;

    matrix.forEach((row, y) => row.forEach((_, x) => {
        let newPixelValue = aplicarMascara(matrix, x, y, mascara);
        mayor = Math.max(mayor, newPixelValue);
        menor = Math.min(menor, newPixelValue);
        matrixCopia[y][x] = newPixelValue;
    }));
    reescalarHistograma(matrixCopia, menor, mayor);
    return matrixCopia;
}

// Función para reescalar el histograma
function reescalarHistograma(histograma, menor, mayor) {
    let m = 255 / (mayor - menor), b = -m * menor;
    const ecuacion = r => Math.round((m * r + b) * 100) / 100;
    histograma.forEach(row => row.forEach((_, j, arr) => arr[j] = ecuacion(arr[j])));
}

// Una vez presionado el botón "empezar" se ejecuta esta función donde se llama a las demás funciones para aplicar el filtro seleccionado
function empezar() {
    let imgData = context_img_original.getImageData(0, 0, imageUploaded.width, imageUploaded.height);
    let matrix = convertTomatrix(imgData.data);
    let pixels = imgData.data;

    // Máscaras para aplicar los filtros
    const mascara_media = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
    const mascara_laplaciano = [[0, 1, 0], [1, -4, 1], [0, 1, 0]];
    const mascara_sobel = [[1, 0, -1], [2, 0, -2], [1, 0, -1]];

    // De acuerdo al filtro que seleccionó el usuario se llama a la función que le corresponde
    switch (filtro_seleccionado.selectedIndex) {
        case 0:
            convertToPixels(filtroMediana(matrix, 3), pixels);
            break;
        case 1:
            convertToPixels(filtroMedia(matrix, mascara_media, 9), pixels);
            break;
        case 2:
            convertToPixels(filtroLaplaSobel(matrix, mascara_laplaciano), pixels);
            break;
        case 3:
            convertToPixels(filtroLaplaSobel(matrix, mascara_sobel), pixels);
            break;
    }
    context_img_filtrada.putImageData(imgData, 0, 0);
}

start();