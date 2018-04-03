import { h } from 'preact';

const Icon = ({ name, width, height, style, handleClick }) => {
    const iconMap = new Map([
        ['circleX', <path d="M4 0c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-1.5 1.781l1.5 1.5 1.5-1.5.719.719-1.5 1.5 1.5 1.5-.719.719-1.5-1.5-1.5 1.5-.719-.719 1.5-1.5-1.5-1.5.719-.719z" />],
        ['circleCheck', <path d="M4 0c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm2 1.781l.719.719-3.219 3.219-1.719-1.719.719-.719 1 1 2.5-2.5z" />],
        ['x', <path d="M1.406 0l-1.406 1.406.688.719 1.781 1.781-1.781 1.781-.688.719 1.406 1.406.719-.688 1.781-1.781 1.781 1.781.719.688 1.406-1.406-.688-.719-1.781-1.781 1.781-1.781.688-.719-1.406-1.406-.719.688-1.781 1.781-1.781-1.781-.719-.688z" />],
        ['sortAscending', <path d="M2 0v6h-2l2.5 2 2.5-2h-2v-6h-1zm2 0v1h2v-1h-2zm0 2v1h3v-1h-3zm0 2v1h4v-1h-4z" />],
        ['sortDescending', <path d="M2 0v6h-2l2.5 2 2.5-2h-2v-6h-1zm2 0v1h4v-1h-4zm0 2v1h3v-1h-3zm0 2v1h2v-1h-2z" />],
        ['triDown', <path d="M0 0l4 4 4-4h-8z" transform="translate(0 2)" />],
        ['triUp', <path d="M4 0l-4 4h8l-4-4z" transform="translate(0 2)" />]
    ]);
    return (
        <div onClick={handleClick}>
            <svg width={width} height={height} viewBox={`0 0 8 8`} xmlns="http://www.w3.org/2000/svg" style={style}>
                {iconMap.get(name)}
            </svg>
        </div>
    )
}

module.exports = {
    Icon
}