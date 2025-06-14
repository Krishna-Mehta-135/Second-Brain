import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { PlusIcon } from "../Icons/PlusIcon";
import { ShareIcon } from "../Icons/ShareIcon";
import { CreateContentModal } from "../components/CreateContentModal";
import { useState } from "react";
import { Sidebar } from '../components/Sidebar';

function Dashboard() {
    const [modalOpen, setModalOpen] = useState(false);
    return (
        
        <div>
            <Sidebar />

            {/* Main content */}
            <div className="p-4 ml-76 min-h-screen bg-gray-100">
            <CreateContentModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                }}
            />

            <div className="flex justify-end gap-4">
                <Button variant="Secondary" text="Share Brain" startIcon={<ShareIcon />} size="md" onClick={() => {
                        setModalOpen(true);
                    }} />
                <Button
                    variant="Primary"
                    text="Add Content"
                    startIcon={<PlusIcon />}
                    size="md"
                    onClick={() => {
                        setModalOpen(true);
                    }}
                />
            </div>

            <div className="flex gap-4 p-4 pt-6">
                <Card title="Sample Title" link="https://x.com/iamvictorjack/status/1917498890800226589" type="tweet" />

                <Card title="Default Title" link="https://www.youtube.com/watch?v=VgnqL0DDLC4" type="video" />
            </div>
            </div>
        </div>
    );
}

export default Dashboard;
