const Table = require('../models/Table');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set.');

module.exports = function (io) {
  // Socket Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role === 'admin' || decoded.username === 'admin') {
        // Verified admin token
        socket.isAdmin = true;
      } else {
        // Verified customer token — attach the table number from the token
        socket.customerTable = decoded.tableNumber;
      }

      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    const tableNo = socket.handshake.query.table;
    const role = socket.handshake.query.role;

    // Helper to get active tables from socket rooms
    const getActiveTables = () => {
      const active = [];
      for (const [roomName, clients] of io.sockets.adapter.rooms.entries()) {
        if (roomName.startsWith('table_') && clients.size > 0) {
          const tableNo = parseInt(roomName.replace('table_', ''), 10);
          if (!isNaN(tableNo)) {
            active.push(tableNo);
          }
        }
      }
      return active;
    };

    // Admin connection (verified via JWT above)
    if (socket.isAdmin) {
      socket.join('admin_room');
      console.log(`Admin joined (Socket: ${socket.id})`);
      socket.emit('active_tables', getActiveTables());
    }

    // Table connection via query param
    if (socket.customerTable) {
      const tableNo = socket.customerTable;
      socket.join(`table_${tableNo}`);
      console.log(`Table ${tableNo} joined (Socket: ${socket.id})`);
      
      // Update DB to active
      Table.findOneAndUpdate({ number: Number(tableNo) }, { status: 'active' }, { new: true })
        .then(() => console.log(`DB Updated: Table ${tableNo} is active`))
        .catch(console.error);

      // Notify admin room about new table
      io.to('admin_room').emit('new_table_joined', {
        tableId: tableNo,
        socketId: socket.id,
      });
    }

    // Table join via event (Backup/Legacy)
    socket.on('join_table', () => {
      if (socket.customerTable) {
        const tableId = socket.customerTable;
        socket.join(`table_${tableId}`);
        console.log(`Table ${tableId} joined via event (Socket: ${socket.id})`);
        // Update DB to active
        Table.findOneAndUpdate({ number: Number(tableId) }, { status: 'active' }, { new: true })
          .then(() => console.log(`DB Updated: Table ${tableId} is active`))
          .catch(console.error);
      }
    });

    // Admin join via event (fallback — only allowed if socket was verified as admin)
    socket.on('join_admin', () => {
      if (!socket.isAdmin) {
        console.warn(`Blocked unauthorized join_admin attempt from Socket: ${socket.id}`);
        return;
      }
      socket.join('admin_room');
      console.log(`Admin joined via event (Socket: ${socket.id})`);
      socket.emit('active_tables', getActiveTables());
    });

    // Customer places an order → broadcast to admin
    socket.on('new_order', async (order) => {
      console.log(`New order received: ${order.id} from Table ${order.tableNumber}`);

      // Security check: Ensure the order belongs to the socket's own table
      if (order.tableNumber !== socket.customerTable) {
        console.warn(`Blocked order: Socket table ${socket.customerTable} tried to order for Table ${order.tableNumber}`);
        socket.emit('order_error', { message: 'Table mismatch: cannot place orders for another table' });
        return;
      }

      // Security check: Ensure table is active
      const table = await Table.findOne({ number: order.tableNumber });
      if (!table || table.status !== 'active') {
        console.warn(`Blocked order from Table ${order.tableNumber} (status: ${table?.status})`);
        socket.emit('order_error', { message: 'Table is not active' });
        return;
      }
      
      // Save order to DB
      try {
        const newOrder = new Order({
          id: order.id,
          tableNumber: order.tableNumber,
          items: order.items,
          total: order.total,
          status: order.status,
          timestamp: order.timestamp,
        });
        await newOrder.save();
      } catch (err) {
        console.error('Failed to save order to DB:', err);
      }

      io.to('admin_room').emit('order_received', order);
    });

    // Admin updates order status → notify the table (admin only)
    socket.on('update_order_status', async (data) => {
      if (!socket.isAdmin) {
        console.warn(`Blocked update_order_status from non-admin Socket: ${socket.id}`);
        return;
      }
      const { orderId, tableNumber, status } = data;
      console.log(`Order ${orderId} status → ${status}`);
      
      try {
        await Order.findOneAndUpdate({ id: orderId }, { status });
      } catch (err) {
        console.error('Failed to update order status in DB:', err);
      }

      io.to(`table_${tableNumber}`).emit('order_status_updated', {
        orderId,
        status,
      });
      // Also broadcast to all admins so all admin screens stay in sync
      socket.to('admin_room').emit('order_status_changed', {
        orderId,
        status,
      });
    });

    // Admin marks table as paid → disconnect the table's customers (admin only)
    socket.on('payment_done', async (tableNumber) => {
      if (!socket.isAdmin) {
        console.warn(`Blocked payment_done from non-admin Socket: ${socket.id}`);
        return;
      }
      console.log(`Payment done for Table ${tableNumber} — disconnecting table`);
      io.to(`table_${tableNumber}`).emit('table_closed');
      
      // Tell admins so they update TableManagement UI
      io.to('admin_room').emit('table_closed', tableNumber);

      // Force disconnect sockets in this room from the server side immediately
      io.in(`table_${tableNumber}`).disconnectSockets(true);

      try {
        await Table.findOneAndUpdate({ number: Number(tableNumber) }, { status: 'available' }, { new: true });
        console.log(`DB Updated: Table ${tableNumber} is available`);
        
        // Delete all orders for this table upon payment completion
        await Order.deleteMany({ tableNumber: Number(tableNumber) });
        console.log(`DB Cleared: Orders for Table ${tableNumber} deleted`);

        // Emit updated active tables
        io.to('admin_room').emit('active_tables', getActiveTables());
      } catch (err) {
        console.error('Error on payment completion (Table or Orders update):', err);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });
};
