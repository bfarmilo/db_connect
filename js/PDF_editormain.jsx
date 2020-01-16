import {h, Component} from 'preact';

let exhibits = {};
/*
class UpdateReference extends React.Component {
  // placeholder for a window that lets the user update an references
  // title, offset, type, author, alias
  // assumes the path and exhibit number has been picked up automatically
  constructor (props) {
    super(props)
  }

  render () {
    
    return (
      <div className="updateModal" />
      )
  }
}
*/

class MyEditor extends Component {

  exhibitClick(event) {
    this.props.onUserInput(event.target.id);
  }

  render() {
      exhibits = this.props.exhibitfile;
      let exhibitList = [];
      let parentDoc;
      for (let elem in exhibits) {
        //get rid of ESLint warning by making sure elem property is present
        if (exhibits.hasOwnProperty(elem)) {
          if (elem !== 'meta') {
            //console.log(`MyEditor: now logging ${elem}: ${exhibits[elem].alias ? exhibits[elem].alias : exhibits[elem].title}`);
            exhibitList.push(<li id={elem} key={exhibits[elem].exhibit} className="tooltip" onClick={(e) => this.exhibitClick(e)} data-tip={exhibits[elem].alias ? exhibits[elem].alias : exhibits[elem].title}>{elem} </li>);
          } else {
            //the meta element
            parentDoc = <li id={elem} key={exhibits[elem].matter.Patent} className="tooltip" onClick={(e) => this.exhibitClick(e)} data-tip={`${exhibits[elem].matter.Party} ${exhibits[elem].doctype} ${exhibits[elem].matter.Patent}`}>{exhibits[elem].doctype} </li>
          }
        }
      }
    
      return (
        <div className="Editor">
          <ul>
            {parentDoc}
            <ul>
              {exhibitList}
            </ul>
          </ul>
        </div>
      )
    }
  }

module.exports = MyEditor;