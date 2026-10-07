export const FONTS = [
  {id:'inter',label:'Inter',family:'Inter, sans-serif',google:'Inter:wght@400;500;600;700;800'},
  {id:'sora',label:'Sora',family:"'Sora', sans-serif",google:'Sora:wght@400;600;700;800'},
  {id:'playfair',label:'Playfair Display',family:"'Playfair Display', serif",google:'Playfair+Display:wght@400;700;800'},
  {id:'space',label:'Space Grotesk',family:"'Space Grotesk', sans-serif",google:'Space+Grotesk:wght@400;500;700'},
  {id:'poppins',label:'Poppins',family:"'Poppins', sans-serif",google:'Poppins:wght@400;500;600;700'},
  {id:'montserrat',label:'Montserrat',family:"'Montserrat', sans-serif",google:'Montserrat:wght@400;500;700;800'},
  {id:'raleway',label:'Raleway',family:"'Raleway', sans-serif",google:'Raleway:wght@400;500;700;800'},
  {id:'nunito',label:'Nunito',family:"'Nunito', sans-serif",google:'Nunito:wght@400;600;700;800'},
  {id:'dm',label:'DM Sans',family:"'DM Sans', sans-serif",google:'DM+Sans:wght@400;500;700'},
  {id:'lora',label:'Lora',family:"'Lora', serif",google:'Lora:wght@400;600;700'},
  {id:'merriweather',label:'Merriweather',family:"'Merriweather', serif",google:'Merriweather:wght@400;700'},
  {id:'outfit',label:'Outfit',family:"'Outfit', sans-serif",google:'Outfit:wght@400;500;700'},
]

export const findFont = (id?: string) => FONTS.find(f => f.id === id) ?? FONTS[0]
export const fontUrl = (id?: string) => `https://fonts.googleapis.com/css2?family=${findFont(id).google}&display=swap`
