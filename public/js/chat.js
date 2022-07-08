const socket = io()

// Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button.send')
const $messages = document.querySelector('#messages')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const fileTemplate = document.querySelector('#file-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('message', (message) => {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('YYYY-MM-DD h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()

    $messageFormButton.setAttribute('disabled', 'disabled')

    const message = e.target.elements.message.value

    socket.emit('sendMessage', message, (error) => {
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (error) {
            return alert(error)
        }

        console.log('Message delivered!')
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})

const clickCopy = (e) => {
    navigator.clipboard.writeText(e.innerHTML);
    navigator.clipboard.readText().then((data) => {
        $messageFormInput.value = data
    })
}

const clickDelete = (e) => {

    const aTag = e.nextElementSibling
    window.URL.revokeObjectURL(aTag.href)
    aTag.setAttribute('class', 'removed')

    socket.emit('deleteFile', aTag.innerHTML, (error) => {

        $messageFormInput.focus()

        if (error) {
            return console.log(error)
        }

        console.log('File deleted!')
    })
}

const selectFile = (e) => {
    $messageForm.querySelector('input#messageFile').click()
}

const sendFile = (files) => {
    const fileSize = files[0].size;
    const fileMb = fileSize / 1024 ** 2;
    if (fileMb >= 100) {
        alert("Please select a file less than 100MB.")
        files.target = null
        return
    }

    console.log(files[0])
    const file = {
        name: files[0].name,
        data: files[0],
        type: files[0].type
    }
    socket.emit('sendFile', file, (error) => {
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (error) {
            return console.log(error)
        }

        console.log('File delivered!')
        files.target = null
    });
}

socket.on('file', (message) => {
    try {
        console.log('[client - file]', message)
        const blob = new Blob([message.file.data], { type: message.file.type })
        const url = window.URL.createObjectURL(blob)

        const html = Mustache.render(fileTemplate, {
            username: message.username,
            url,
            filename: message.file.name,
            createdAt: moment(message.createdAt).format('YYYY-MM-DD h:mm a')
        })
        $messages.insertAdjacentHTML('beforeend', html)
        autoscroll()
    } catch (e) {
        console.log('file:', e)
    }
})
