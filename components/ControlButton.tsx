interface ControlButtonProps {
    label: string;
    isEnabled: boolean;
    onClick: () => void;
}

export const ControlButton = ({ label, isEnabled, onClick }: ControlButtonProps) => {
    return (
        <div className="flex flex-row justify-between w-full">
            <span>{label}</span>
            {isEnabled && (
                <button onClick={onClick} className="cursor-pointer">
                    Click
                </button>
            )}
        </div>
    );
};
