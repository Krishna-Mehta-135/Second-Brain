import "./App.css";
import {Button} from "./../components/Button";
import {PlusIcon} from "./../Icons/PlusIcon";

function App() {
    return (
        <>
            <Button
                variant="Secondary"
                size="sm"
                text="Secondary"
                startIcon={<PlusIcon size="sm" />}
                onClick={() => {}}
            />
            <Button variant="Primary" size="md" text="Primary" startIcon={<PlusIcon size="md" />} onClick={() => {}} />
            <Button variant="Secondary" size="lg" text="large" startIcon={<PlusIcon size="lg" />} onClick={() => {}} />
        </>
    );
}

export default App;
