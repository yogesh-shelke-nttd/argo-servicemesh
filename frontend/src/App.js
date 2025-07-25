import React, { useState } from 'react';

function App() {
    const [data, setData] = useState('');

    const fetchData = async () => {
        const response = await fetch('http://localhost:80/api/data');
        const result = await response.json();
        setData(result.message);
    };

    return (
        <div>
            <h1>Frontend App</h1>
            <button onClick={fetchData}>Get Data from Backend</button>
            <p>{data}</p>
        </div>
    );
}

export default App;

