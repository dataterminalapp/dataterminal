const Messages = ({
  messages,
}: {
  messages: Array<{ role: string; message: string }>;
}) => {
  return (
    <div className="flex flex-col gap-4">
      {messages.map(({ role, message }) => {
        if (role === "user") {
          return (
            <div className="text-base ml-auto bg-white/5 w-fit p-4 py-2 rounded-3xl max-w-xl">
              {message}
            </div>
          );
        } else {
          return (
            <div className="text-base mr-auto w-fit p-4 py-2 rounded-3xl max-w-xl">
              {message}
            </div>
          );
        }
      })}
    </div>
  );
};

export default Messages;
