import "./App.css";
import { Card } from '../components/Card';


function App() {
    return (
        <>
            <Card title="Sample Title" link="https://x.com/iamvictorjack/status/1917498890800226589" type="tweet" /><br></br>
            <Card title="Default Title" link="https://www.youtube.com/watch?v=VgnqL0DDLC4" type="video" />
            
        </>
    );
}

export default App;
