import { h } from 'preact';

const Throbber = props => {

    const styles = {
        display: props.visible ? 'flex' : 'none',
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        height: props.windowHeight,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.7)'
    }

    return (<div style={styles}>
        <svg version='1.1' x='0px' y='0px' width='40px' height='50px' viewBox='0 0 24 30'>
            {[0, 1, 2].map(x => (
                <rect key={x} x={x * 7} y='0' width='4' height='20' fill={props.themeColor}>
                    <animate attributeName='opacity' attributeType='XML'
                        values='1; .2; 1'
                        begin={`${x * 0.2}s`} dur='0.6s' repeatCount='indefinite' />
                </rect>
            ))}
        </svg>
    </div>)
}

module.exports = { Throbber };