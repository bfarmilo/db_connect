import { h } from 'preact';

const Icon = ({ name, width, height, style, handleClick }) => {

    const iconStyle = { display: 'flex', ...style }; //this will allow 'style' to overwrite display if needed

    const iconMap = new Map([
        ['circleX', { svg: <path d="M4 0c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-1.5 1.781l1.5 1.5 1.5-1.5.719.719-1.5 1.5 1.5 1.5-.719.719-1.5-1.5-1.5 1.5-.719-.719 1.5-1.5-1.5-1.5.719-.719z" /> }],
        ['circleCheck', { svg: <path d="M4 0c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm2 1.781l.719.719-3.219 3.219-1.719-1.719.719-.719 1 1 2.5-2.5z" /> }],
        ['x', { svg: <path d="M1.406 0l-1.406 1.406.688.719 1.781 1.781-1.781 1.781-.688.719 1.406 1.406.719-.688 1.781-1.781 1.781 1.781.719.688 1.406-1.406-.688-.719-1.781-1.781 1.781-1.781.688-.719-1.406-1.406-.719.688-1.781 1.781-1.781-1.781-.719-.688z" /> }],
        ['circleMinus', { svg: <g><ellipse cx="200" cy="200" rx="200" ry="200" /><path style="stroke-width:50; stroke-linecap:round;stroke:#FFFFFF" d="M70 200 L320 200" /></g> }],
        ['circlePlus', { svg: <g><ellipse cx="200" cy="200" rx="200" ry="200" /><path style="stroke-width:50; stroke-linecap:round;stroke:#FFFFFF" d="M70 200 L320 200" /><path style="stroke-width:50; stroke-linecap:round; stroke:#FFFFFF" d="M200 70 L200 320" /></g> }],
        ['sortAscending', { svg: <path d="M2 0v6h-2l2.5 2 2.5-2h-2v-6h-1zm2 0v1h2v-1h-2zm0 2v1h3v-1h-3zm0 2v1h4v-1h-4z" /> }],
        ['sortDescending', { svg: <path d="M2 0v6h-2l2.5 2 2.5-2h-2v-6h-1zm2 0v1h4v-1h-4zm0 2v1h3v-1h-3zm0 2v1h2v-1h-2z" /> }],
        ['triDown', { svg: <path d="M0 0l4 4 4-4h-8z" transform="translate(0 2)" /> }],
        ['triUp', { svg: <path d="M4 0l-4 4h8l-4-4z" transform="translate(0 2)" /> }],
        ['jumpFile', {
            viewBox: '0 0 511.626 511.627', svg: <g>
                <path d="M392.857,292.354h-18.274c-2.669,0-4.859,0.855-6.563,2.573c-1.718,1.708-2.573,3.897-2.573,6.563v91.361
			c0,12.563-4.47,23.315-13.415,32.262c-8.945,8.945-19.701,13.414-32.264,13.414H82.224c-12.562,0-23.317-4.469-32.264-13.414
			c-8.945-8.946-13.417-19.698-13.417-32.262V155.31c0-12.562,4.471-23.313,13.417-32.259c8.947-8.947,19.702-13.418,32.264-13.418
			h200.994c2.669,0,4.859-0.859,6.57-2.57c1.711-1.713,2.566-3.9,2.566-6.567V82.221c0-2.662-0.855-4.853-2.566-6.563
			c-1.711-1.713-3.901-2.568-6.57-2.568H82.224c-22.648,0-42.016,8.042-58.102,24.125C8.042,113.297,0,132.665,0,155.313v237.542
			c0,22.647,8.042,42.018,24.123,58.095c16.086,16.084,35.454,24.13,58.102,24.13h237.543c22.647,0,42.017-8.046,58.101-24.13
			c16.085-16.077,24.127-35.447,24.127-58.095v-91.358c0-2.669-0.856-4.859-2.574-6.57
			C397.709,293.209,395.519,292.354,392.857,292.354z"/>
                <path d="M506.199,41.971c-3.617-3.617-7.905-5.424-12.85-5.424H347.171c-4.948,0-9.233,1.807-12.847,5.424
			c-3.617,3.615-5.428,7.898-5.428,12.847s1.811,9.233,5.428,12.85l50.247,50.248L198.424,304.067
			c-1.906,1.903-2.856,4.093-2.856,6.563c0,2.479,0.953,4.668,2.856,6.571l32.548,32.544c1.903,1.903,4.093,2.852,6.567,2.852
			s4.665-0.948,6.567-2.852l186.148-186.148l50.251,50.248c3.614,3.617,7.898,5.426,12.847,5.426s9.233-1.809,12.851-5.426
			c3.617-3.616,5.424-7.898,5.424-12.847V54.818C511.626,49.866,509.813,45.586,506.199,41.971z"/>
            </g>
        }],
        ['rotate', {
            viewBox: '0 0 305.836 305.836', svg: <path d="M152.924,300.748c84.319,0,152.912-68.6,152.912-152.918c0-39.476-15.312-77.231-42.346-105.564
           c0,0,3.938-8.857,8.814-19.783c4.864-10.926-2.138-18.636-15.648-17.228l-79.125,8.289c-13.511,1.411-17.999,11.467-10.021,22.461
           l46.741,64.393c7.986,10.992,17.834,12.31,22.008,2.937l7.56-16.964c12.172,18.012,18.976,39.329,18.976,61.459
           c0,60.594-49.288,109.875-109.87,109.875c-60.591,0-109.882-49.287-109.882-109.875c0-19.086,4.96-37.878,14.357-54.337
           c5.891-10.325,2.3-23.467-8.025-29.357c-10.328-5.896-23.464-2.3-29.36,8.031C6.923,95.107,0,121.27,0,147.829
           C0,232.148,68.602,300.748,152.924,300.748z"/>
        }],
        ['prevArrow', { viewBox: '0 0 292.359 292.359', svg: <path d="M222.979,5.424C219.364,1.807,215.08,0,210.132,0c-4.949,0-9.233,1.807-12.848,5.424L69.378,133.331   c-3.615,3.617-5.424,7.898-5.424,12.847c0,4.949,1.809,9.233,5.424,12.847l127.906,127.907c3.614,3.617,7.898,5.428,12.848,5.428   c4.948,0,9.232-1.811,12.847-5.428c3.617-3.614,5.427-7.898,5.427-12.847V18.271C228.405,13.322,226.596,9.042,222.979,5.424z" /> }],
        ['nextArrow', { viewBox: '0 0 292.359 292.359', svg: <path d="M222.979,133.331L95.073,5.424C91.456,1.807,87.178,0,82.226,0c-4.952,0-9.233,1.807-12.85,5.424   c-3.617,3.617-5.424,7.898-5.424,12.847v255.813c0,4.948,1.807,9.232,5.424,12.847c3.621,3.617,7.902,5.428,12.85,5.428   c4.949,0,9.23-1.811,12.847-5.428l127.906-127.907c3.614-3.613,5.428-7.897,5.428-12.847   C228.407,141.229,226.594,136.948,222.979,133.331z" /> }]

    ]);
    return (
        <div onClick={handleClick}>
            <svg
                width={width}
                height={height}
                viewBox={iconMap.get(name).viewBox || `0 0 8 8`}
                xmlns="http://www.w3.org/2000/svg"
                style={iconStyle}>
                {iconMap.get(name).svg}
            </svg>
        </div>
    )
}

module.exports = {
    Icon
}