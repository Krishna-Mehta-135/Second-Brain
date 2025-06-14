import React, {useState} from "react";
import {Link} from "react-router-dom";

const Signup = () => {
    const [formData, setFormData] = useState();
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="border p-4">
                <div className="flex justify-between">
                    <h1>Sign Up</h1>
                    <p>
                        or{" "}
                        <Link to="/signin">
                            <span className="text-blue-400">Sign in</span>
                        </Link>{" "}
                    </p>
                </div>
                <div className="flex flex-col justify-center text-center">
                    <label htmlFor="Name">Name</label>
                    <input type="text" className="border" />
                    <label htmlFor="Email">Email</label>
                    <input type="text" className="border" />
                    <label htmlFor="Password">Password</label>
                    <input type="text" className="border" />
                </div>
            </div>
        </div>
    );
};

export default Signup;
