document.addEventListener('DOMContentLoaded', function () {
    const ordersList = document.getElementById('ordersList');

    // Lae salvestatud tellimused
    const savedOrders = JSON.parse(localStorage.getItem('orders')) || [];
    savedOrders.forEach(order => addOrderToList(order.name, order.order));

    document.getElementById('orderForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const order = document.getElementById('order').value;

        if (name && order) {
            // Lisa tellimus nimekirja ja salvestusse
            addOrderToList(name, order);
            savedOrders.push({ name, order });
            localStorage.setItem('orders', JSON.stringify(savedOrders));

            // Tühjenda sisestusväljad
            document.getElementById('name').value = '';
            document.getElementById('order').value = '';
        } else {
            alert('Palun täida kõik väljad!');
        }
    });

    function addOrderToList(name, order) {
        const listItem = document.createElement('li');
        listItem.textContent = `${name}: ${order}`;
        ordersList.appendChild(listItem);
    }
});
