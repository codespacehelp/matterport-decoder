// parse.js
const fs = require("fs");
const path = require("path");
const protobuf = require("protobufjs");

const result = protobuf.parse(fs.readFileSync("dam.proto", "utf8"));
// console.log(result);

const root = result.root;
const DAMFile = root.lookupType("DAMFile");

// if (process.argv.length < 3) {
//   console.log("Usage: node parse.js <dam_file_path>");
//   process.exit(1);
// }
// const filePath = process.argv[2];
const filePath = "assets/national_gallery/national_gallery.dam";

// Read the protobuf file content
const buffer = fs.readFileSync(filePath);

// Decode the protobuf data
const damFile = DAMFile.decode(buffer);

// Generate the OBJ and MTL files
generateObjAndMtlFiles(damFile, filePath);

function writeObjVertices(damFile) {
  let objContent = "";
  let chunkVertSizes = [];

  damFile.chunk.forEach((chunk) => {
    const xyz = chunk.vertices.xyz;

    for (let i = 0; i < xyz.length; i += 3) {
      const x = xyz[i];
      const y = xyz[i + 1];
      const z = xyz[i + 2];

      // Rotate -90 degrees around the X axis
      const rotatedY = z;
      const rotatedZ = -y;

      objContent += `v ${x} ${rotatedY} ${rotatedZ}\n`;
    }

    chunkVertSizes.push(xyz.length / 3);
  });

  objContent += "\n";

  return { objContent, chunkVertSizes };
}

function writeObjUV(damFile) {
  let objContent = "";

  damFile.chunk.forEach((chunk) => {
    const uv = chunk.vertices.uv;

    for (let i = 0; i < uv.length; i += 2) {
      objContent += `vt ${uv[i]} ${uv[i + 1]}\n`;
    }
  });

  objContent += "\n";

  return objContent;
}

function writeObjFaces(damFile, chunkVertSizes) {
  let objContent = "";

  damFile.chunk.forEach((chunk, chunkId) => {
    const chunkName = chunk.chunkName;
    const materialName = chunk.materialName;
    const faces = chunk.faces.faces;

    objContent += `usemtl ${materialName}\n`;
    objContent += `o ${chunkName}\n`;

    const offset = chunkVertSizes.slice(0, chunkId).reduce((a, b) => a + b, 0);

    for (let i = 0; i < faces.length; i += 3) {
      const f1 = faces[i] + 1 + offset;
      const f2 = faces[i + 1] + 1 + offset;
      const f3 = faces[i + 2] + 1 + offset;

      objContent += `f ${f1}/${f1} ${f2}/${f2} ${f3}/${f3}\n`;
    }

    objContent += "\n";
  });

  return objContent;
}

function generateObjAndMtlFiles(damFile, filePath) {
  // Prepare the file names (because the obj file refers to the mtl file)

  const f = path.parse(filePath);
  const baseName = path.join(f.dir, f.name);
  const mtlFilename = `${baseName}.mtl`;
  const objFilename = `${baseName}.obj`;

  const { objContent: objVertices, chunkVertSizes } = writeObjVertices(damFile);
  const objUV = writeObjUV(damFile);
  const objFaces = writeObjFaces(damFile, chunkVertSizes);

  const objContent = `mtllib ${mtlFilename}\n\n${objVertices}${objUV}${objFaces}`;

  // Generate MTL content
  let mtlContent = "";
  damFile.chunk.forEach((chunk) => {
    const materialName = chunk.materialName;

    mtlContent += `newmtl ${materialName}\n`;
    mtlContent += `map_Ka ${materialName}\n`;
    mtlContent += `map_Kd ${materialName}\n`;
    mtlContent += "\n";
  });

  // Save the generated OBJ and MTL files
  fs.writeFileSync(objFilename, objContent);
  fs.writeFileSync(mtlFilename, mtlContent);
}
