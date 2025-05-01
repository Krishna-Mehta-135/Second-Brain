import "./App.css";
import {Button} from "./../components/Button";
import {PlusIcon} from "./../Icons/PlusIcon";
import { Card } from './../components/Card';
import { Logo } from './../Icons/Logo';
import { ShareIcon } from './../Icons/ShareIcon';
import { TwitterIcon } from './../Icons/TwitterIcon';
import { YoutubeIcon } from './../Icons/YoutubeIcon';

function App() {
    return (
        <>
            <Button
                variant="Secondary"
                size="sm"
                text="Secondary"
                startIcon={<PlusIcon  />}
                onClick={() => {}}
            />
            <Button variant="Primary" size="md" text="Primary" startIcon={<PlusIcon  />} onClick={() => {}} />
            <Button variant="Secondary" size="lg" text="large" startIcon={<PlusIcon  />} onClick={() => {}} />
            


            <Logo/>
            <ShareIcon />
            <TwitterIcon />
            <YoutubeIcon />
            <PlusIcon />

            <Card />
        </>
    );
}

export default App;
