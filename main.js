const MAXFPS = 120;
const SPONGESIZE = 400;

const vec3 = (x, y, z) => {
    return {x, y, z};
};

const FL = -500
const CAMERA = vec3(0, 0, 600);
const LIGHT = vec3(-1, -1, 1);
const BASECOLOR = vec3(0, 128, 128);
const STROKECOLOR = 'black'

//
//  Cube
//
const getcube = (cells, {x, y, z}, l) => {
    const half = l / 2
    const vertices = [
        vec3(x * l - half,y * l - half,z * l - half),
        vec3(x * l + half,y * l - half,z * l - half),
        vec3(x * l + half,y * l + half,z * l - half),
        vec3(x * l - half,y * l + half,z * l - half),
        vec3(x * l - half,y * l - half,z * l + half),
        vec3(x * l + half,y * l - half,z * l + half),
        vec3(x * l + half,y * l + half,z * l + half),
        vec3(x * l - half,y * l + half,z * l + half)
    ]

    const VERTICESFORFACE = 6;
    const facever = [[1,5,6,2], [3, 2, 6, 7], [4,7,6,5], [0,3,7,4],[0, 4, 5, 1],[0, 1, 2, 3]];

    const dirind = [vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1), vec3(-1, 0, 0), vec3(0, -1, 0), vec3(0, 0, -1)];
    const faces = [];
    for(let i = 0; i < VERTICESFORFACE; i++) {
        const dir = dirind[i]; 
        if(!cells.some(cell => ((cell.x == x + dir.x) && (cell.y == y + dir.y) && (cell.z == z + dir.z))))       
            faces.push([vertices[facever[i][0]],
                        vertices[facever[i][1]],
                        vertices[facever[i][2]],
                        vertices[facever[i][3]]]);
    }

    return faces;
}

const normal = (face) => {
    const p1 = face[0];
    const p2 = face[1];
    const p3 = face[2];

    const v1 = vec3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    const v2 = vec3(p3.x - p1.x, p3.y - p1.y, p3.z - p1.z);

    const n = vec3(
        v1.y * v2.z - v1.z * v2.y,
        v1.z * v2.x - v1.x * v2.z,
        v1.x * v2.y - v1.y * v2.x
    );

    const module = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z)
    return vec3(n.x/module, n.y/module, n.z/module);
}

const rotate = (faces, ax, ay, az) => {
    const cosx = Math.cos(ax), cosy = Math.cos(ay), cosz = Math.cos(az);
    const sinx = Math.sin(ax), siny = Math.sin(ay), sinz = Math.sin(az);

    const rotatex = v => vec3(
            v.x,
            v.y * cosx + v.z * sinx,
            v.y * -sinx + v.z * cosx
        );

    const rotatey = v => vec3(
        v.x * cosy + v.y * -siny,
        v.x * siny + v.y * cosy,
        v.z,
        );

    const rotatez = v => vec3(
        v.x * cosz + v.z * sinz,
        v.y,
        v.x * -sinz + v.z * cosz,
        );

    for(let i = 0; i < faces.length; i++)
        faces[i] = faces[i].map(v => rotatez(rotatey(rotatex(v))));
}

const painterAlgorithm = faces => {
    const getBaricenter = face => {
        let barz = 0;
        for(let v of face)
            barz += v.z;
        barz /= face.length;
        return barz;
    }
    faces.forEach(face => face.baricenterz = getBaricenter(face));
    faces.sort((a, b) => a.baricenterz - b.baricenterz);
}

//
// Menger Sponge
//
let sponge;

const getcells = ({x, y, z}, n) => {
    if(n == 0) {
        return [vec3(x, y, z)];
    }
    const size = Math.pow(3, n - 1);
    let cells = [];

    for(let i = -1; i < 2; i++)
        for(let j = -1; j < 2; j++)
            for(let k = -1; k < 2; k++)
                if(Math.abs(i) + Math.abs(j) + Math.abs(k) > 1)
                    cells.push(...getcells(vec3(x + size * i, y + size * j, z + size * k), n - 1));

    return cells;
}

const getsponge = (size, n) => {
    const cells = getcells(vec3(0, 0, 0), n);

    const l = size/(Math.pow(3, n));
    const faces = [];
    for(let cell of cells)
        faces.push(...getcube(cells, vec3(cell.x, cell.y, cell.z), l));

    return faces;
}

let w = vec3();
const updatesponge = (delta, w) => {
    rotate(sponge, w.x * delta/1000, w.y * delta/1000, w.z * delta/1000);
    painterAlgorithm(sponge);
};

//
//  Rendering
//
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const project = ({x, y, z}) => vec3(x * (FL / (z - CAMERA.z)), y * (FL / (z - CAMERA.z)), 0);
const light = n => n.x * LIGHT.x + n.y * LIGHT.y + n.z * LIGHT.z; 

let c;
const drawface = (face, origin) => {
    const n = normal(face);
    if(n.x * face[0].x + (n.y - CAMERA.x) * face[0].y + (n.z - CAMERA.y) * (face[0].z - CAMERA.z) < 0)  return;
    //const projected = face; //ORTHOGONAL
    const projected = face.map(v => project(v)); //PRESPECTIVE
    const lightvalue = -light(n) * 50 - 25;

    ctx.strokeStyle = STROKECOLOR;
    ctx.fillStyle = `rgb(${BASECOLOR.x + lightvalue},${BASECOLOR.y + lightvalue},${BASECOLOR.z + lightvalue}`;
    ctx.beginPath();
    ctx.moveTo(origin.x + projected[0].x, origin.y + projected[0].y);
    ctx.lineTo(origin.x + projected[1].x, origin.y + projected[1].y);
    ctx.lineTo(origin.x + projected[2].x, origin.y + projected[2].y);
    ctx.lineTo(origin.x + projected[3].x, origin.y + projected[3].y);
    ctx.closePath();
    ctx.fill();
    //ctx.stroke();   
}

const drawsponge = () => {
    const origin = {x: canvas.width/2, y: canvas.height/2, z: canvas.height/2};

    for(let face of sponge)
        drawface(face, origin, ctx);    
};

//
//  Main Loop
//
let lastTime;
const loop = now => {
    if(!lastTime) lastTime = now;
    let delta = now - lastTime;

    if(delta > 1000/MAXFPS) {
        w.x = document.getElementById('wx').value/100;
        w.y = document.getElementById('wy').value/100;
        w.z = document.getElementById('wz').value/100;

        canvas.height = innerHeight;
        canvas.width = innerWidth;

        updatesponge(delta, w);    
        drawsponge();
    }

    lastTime = now;
    requestAnimationFrame(loop);
};

//
//  Event listener
//
const depthSlider = document.getElementById('depth');
const sliders = vec3(document.getElementById('wx'), document.getElementById('wy'), document.getElementById('wz'));

let depth = depthSlider.value;
depthSlider.addEventListener('change', () => {
    depth = depthSlider.value;
    sponge = getsponge(SPONGESIZE, depth);
})

for(let axis in sliders)
    sliders[axis].addEventListener('change', () => w[axis] = sliders[axis].value)

//
//  Start
//
sponge = getsponge(SPONGESIZE, depth);
loop();

