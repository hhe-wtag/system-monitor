import { createServer } from "http";

const server = createServer((req, res) => {
  const url = req.url;
  if (url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.write("<h1>Hello, The server is up and running!</h1>");
    res.end();
  }
});

server.listen(8000, () => {
  console.log("Server is listening on port: 8000");
});
