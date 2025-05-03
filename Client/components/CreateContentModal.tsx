import {CloseIcon} from "../Icons/CloseIcon";
import {Button} from "./Button";

export const CreateContentModal = ({open, onClose}) => {
    // We will make a controlled component. Controlled components in React ensure that the form data is handled by the React state, providing a consistent and predictable way to manage user input.
    //State management is often handled in the parent component, especially when multiple child components need to interact or share state. The parent component maintains the state and passes it down to child components via props.

    return (
        <div>
            {open && (
                <div className="w-screen h-screen bg-slate-500 fixed top-0 left-0 opacity-60 flex justify-center ">
                    <div className="flex flex-col justify-center">
                        <span className="bg-white p-4 opacity-100 rounded">
                            <div className="flex justify-end">
                                <div onClick={onClose} className="cursor-pointer">
                                <CloseIcon />
                                </div>
                            </div>
                            <div>
                                <Input placeholder={"Title"} />
                                <Input placeholder={"Link"} />
                            </div>
                            <div className="flex justify-center">
                                <Button variant="Primary" size="md" text="Submit" onClick={() => {}} />
                            </div>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

const Input = ({onChange, placeholder}) => {
    return (
        <div>
            <input
                placeholder={placeholder}
                onChange={onChange}
                type={"text"}
                className="px-4 py-2 border rounded m-2"
            />
        </div>
    );
};
